import { useEffect, useState, useCallback, useRef } from "react";
import type { ObjectLayer, TiledMap, TileLayer } from "../types/canvas";
import { useDispatch, useSelector } from "react-redux";
import { updateCurrentUser } from "../Redux/roomState";
import { ensureTilePosition, type TilePosition } from "../lib/helper";
import { useSocket } from "../SocketProvider";
import type {
  InteractableObject,
  InteractablesMap,
} from "../Interactables/coreDS";
import type {
  InteractionEvent,
  InteractionManager as InteractionManagerType,
} from "../Interactables/manager";
import { InteractionManager } from "../Interactables/manager";
import { InteractablesMapBuilder } from "../Interactables/mapBuilder";
import type { RootState } from "../Redux";
import { dispatchInteractable, dispatchInteractables } from "../lib/helper";

type Props = {
  mapData: TiledMap;
  ctx: CanvasRenderingContext2D | null;
  tilesize: number;
  playerImage: HTMLImageElement | null;
  playerPosition: { x: number; y: number };
  onInteraction: (event: InteractionEvent) => void;

  joystickMovement?: { x: number; y: number } | null;
};

interface CollisionMap {
  width: number;
  height: number;
  tiles: boolean[][];
}

const Player = ({
  mapData,
  ctx,
  tilesize,
  playerImage,
  playerPosition,
  onInteraction,
  joystickMovement,
}: Props) => {
  const [collisionMap, setCollisionMap] = useState<CollisionMap | null>(null);
  const dispatch = useDispatch();
  const socket = useSocket();

  const lastMoveTime = useRef(0);
  const movementCooldown = useRef(150); // ms between moves
  const movementThreshold = useRef(0.3); // minimum distance to trigger movement

  const [interactablesMap, setInteractablesMap] =
    useState<InteractablesMap | null>(null);
  const { availableInteractions, closestInteraction } = useSelector(
    (state: RootState) => state.interactionState
  );
  const interactionManagerRef = useRef<InteractionManagerType | null>(null);

  // Critical dont touch, mistake in past!!!: Always ensure we're working with tile coordinates no pixels
  //   useEffect(() => {
  //   if (externalPosition && isPixelCoordinate(externalPosition)) {
  //     console.warn('⚠️ COORDINATE SYSTEM ISSUE: Received pixel coordinates:', externalPosition);
  //     console.warn('🔧 Converting to tile coordinates:', ensureTilePosition(externalPosition));
  //   }
  // }, [externalPosition]);

  const updatePosition = useCallback(
    (newPos: TilePosition) => {
      const tilePos = ensureTilePosition(newPos);

      // console.log("📍 Updating player position to tile:", tilePos);
      dispatch(updateCurrentUser(tilePos));

      if (interactionManagerRef.current) {
        interactionManagerRef.current.updateInteractions(tilePos);
      }
    },
    [dispatch]
  );

  // Builds collision map
  useEffect(() => {
    if (!mapData) return;

    const map: CollisionMap = {
      width: mapData.width,
      height: mapData.height,
      tiles: Array(mapData.height)
        .fill(null)
        .map(() => Array(mapData.width).fill(false)),
    };

    const interactables =
      InteractablesMapBuilder.buildInteractablesMap(mapData);
    setInteractablesMap(interactables);

    // Process all layers for collision detection
    mapData.layers.forEach((layer) => {
      if (isTileLayer(layer)) {
        const hasCollisionProperty = (layer as any).properties?.some(
          (prop: any) => prop.name === "collision" && prop.value === true
        );

        const isCollisionLayer =
          hasCollisionProperty ||
          [
            "collision",
            "wall",
            "solid",
            "chair",
            "computer",
            "vendingmachine",
            "whiteboard",
            "objectscollide",
            "genericobjectscollide",
          ].some((keyword) => layer.name.toLowerCase().includes(keyword));

        if (isCollisionLayer) {
          layer.data.forEach((gid, index) => {
            if (gid === 0) return;

            const tileX = index % mapData.width;
            const tileY = Math.floor(index / mapData.width);

            if (
              tileX >= 0 &&
              tileX < map.width &&
              tileY >= 0 &&
              tileY < map.height
            ) {
              map.tiles[tileY][tileX] = true;
            }
          });
        }
      }

      if (isObjectLayer(layer)) {
        const layerHasCollision = layer.properties?.some(
          (prop: any) => prop.name === "collision" && prop.value === true
        );

        const isKnownCollisionLayer = [
          "Wall",
          "walls",
          "Chair",
          "chairs",
          "Object",
          "collision",
          "wall",
          "solid",
          "chair",
          "computer",
          "vendingmachine",
          "whiteboard",
          "objectscollide",
          "genericobjectscollide",
        ].some((keyword) => layer.name.toLowerCase().includes(keyword));

        layer.objects.forEach((obj) => {
          const objectHasCollision = obj.properties?.some(
            (prop) => prop.name === "collision" && prop.value === true
          );

          const shouldCollide =
            layerHasCollision || isKnownCollisionLayer || objectHasCollision;

          if (shouldCollide && obj.x !== undefined && obj.y !== undefined) {
            const objLeft = Math.floor(obj.x / mapData.tilewidth);
            const objTop = Math.floor(
              (obj.y - (obj.height || mapData.tileheight)) / mapData.tileheight
            );
            const objRight = Math.floor(
              (obj.x + (obj.width || mapData.tilewidth) - 1) / mapData.tilewidth
            );
            const objBottom = Math.floor((obj.y - 1) / mapData.tileheight);

            for (
              let tileY = Math.max(0, objTop);
              tileY <= Math.min(map.height - 1, objBottom);
              tileY++
            ) {
              for (
                let tileX = Math.max(0, objLeft);
                tileX <= Math.min(map.width - 1, objRight);
                tileX++
              ) {
                map.tiles[tileY][tileX] = true;
              }
            }
          }
        });
      }
    });

    // Add map boundaries
    for (let x = 0; x < map.width; x++) {
      if (map.tiles[0]) map.tiles[0][x] = true;
      if (map.tiles[map.height - 1]) map.tiles[map.height - 1][x] = true;
    }
    for (let y = 0; y < map.height; y++) {
      if (map.tiles[y]) {
        map.tiles[y][0] = true;
        map.tiles[y][map.width - 1] = true;
      }
    }

    setCollisionMap(map);
  }, [mapData]);

  useEffect(() => {
    if (!interactablesMap) return;

    const manager = new InteractionManager(interactablesMap);
    interactionManagerRef.current = manager;

    // Subscribe to interaction events
    const unsubscribe = manager.subscribe((event: InteractionEvent) => {
      switch (event.type) {
        case "available":
          console.log(
            "✨ Interaction available:",
            event.object?.type,
            event.objectId,
            event.position
          );
          dispatchInteractables(dispatch, manager.getAvailableInteractions());
          dispatchInteractable(
            dispatch,
            manager.getClosestInteraction(playerPosition)
          );
          break;

        case "lost":
          console.log(
            "❌ Interaction lost:",
            event.objectId,
            manager.getAvailableInteractions(),
            manager.getClosestInteraction(playerPosition)
          );
          dispatchInteractables(dispatch, manager.getAvailableInteractions());

          dispatchInteractable(
            dispatch,
            manager.getClosestInteraction(playerPosition)
          );
          break;

        case "triggered":
          console.log(
            "🎯 Interaction triggered:",
            event.object?.type,
            event.objectId
          );
          if (event.object && onInteraction) {
            onInteraction(event);
          }
          break;
      }
    });
    manager.updateInteractions(playerPosition);

    return () => {
      unsubscribe();
      manager.cleanup();
    };
  }, [interactablesMap]);

  // handles interaction checking on each player position in isolated manager
  useEffect(() => {
    const manager = interactionManagerRef.current;
    if (manager) {
      manager.updateInteractions(playerPosition);
    }
  }, [playerPosition]);

  const isValidPosition = useCallback(
    (tilePos: TilePosition): boolean => {
      if (!collisionMap) return false;

      if (
        tilePos.x < 0 ||
        tilePos.x >= collisionMap.width ||
        tilePos.y < 0 ||
        tilePos.y >= collisionMap.height
      ) {
        return false;
      }

      return !collisionMap.tiles[tilePos.y][tilePos.x];
    },
    [collisionMap]
  );

  // This part handles movement of character after load
  useEffect(() => {
    if (!collisionMap) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return; // don't move when typing
      }

      if (e.key === "e" || e.key === "E" || e.key === " ") {
        e.preventDefault();
        if (interactionManagerRef.current && closestInteraction) {
          interactionManagerRef.current.triggerInteraction(
            closestInteraction.id
          );
        }
        return;
      }

      if (
        [
          "ArrowUp",
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight",
          "w",
          "a",
          "s",
          "d",
          "W",
          "A",
          "S",
          "D",
        ].includes(e.key)
      ) {
        e.preventDefault();
      }

      const currentPos = ensureTilePosition(playerPosition);
      let newPos: TilePosition = { ...currentPos };

      switch (e.key.toLowerCase()) {
        case "arrowup":
        case "w":
          newPos.y--;
          break;
        case "arrowdown":
        case "s":
          newPos.y++;
          break;
        case "arrowleft":
        case "a":
          newPos.x--;
          break;
        case "arrowright":
        case "d":
          newPos.x++;
          break;
        default:
          return;
      }

      if (isValidPosition(newPos)) {
        updatePosition(newPos);
        socket.emit("user-move", { x: newPos.x, y: newPos.y });
      } else {
        console.log("🚫 Movement blocked to:", newPos);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    playerPosition,
    isValidPosition,
    updatePosition,
    collisionMap,
    closestInteraction,
  ]);

  useEffect(() => {
    if (!collisionMap || !joystickMovement) return;
  
  const now = Date.now();
  if (now - lastMoveTime.current < movementCooldown.current) return;

  const { x, y } = joystickMovement;
  const distance = Math.sqrt(x * x + y * y);
  
  
  if (distance < movementThreshold.current) {
    return;
  }
    const currentPos = ensureTilePosition(playerPosition);
    let newPos: TilePosition = { ...currentPos };
    const absX = Math.abs(x);
    const absY = Math.abs(y);

    if (absX > absY) {
      // Horizontal movement
      if (x > 0) {
        newPos.x++; // Right
      } else {
        newPos.x--; // Left
      }
    } else {
      // Vertical movement
      if (y > 0) {
        newPos.y++; // Down
      } else {
        newPos.y--; // Up
      }
    }

    if (isValidPosition(newPos)) {
      updatePosition(newPos);
      socket.emit("user-move", { x: newPos.x, y: newPos.y });
      lastMoveTime.current = now;
    }
  }, [
    joystickMovement,
    collisionMap,
    playerPosition,
    isValidPosition,
    updatePosition,
    socket,
  ]);

  
  return null;
};

// this one just checks for tile layer and object layer --> TILED CONCEPT IT IS
function isObjectLayer(layer: any): layer is ObjectLayer {
  return layer.type === "objectgroup" && Array.isArray(layer.objects);
}

function isTileLayer(layer: ObjectLayer | TileLayer): layer is TileLayer {
  return layer.type === "tilelayer" && Array.isArray(layer.data);
}

export default Player;

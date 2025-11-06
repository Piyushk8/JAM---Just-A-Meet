import { useEffect, useState, useCallback, useRef } from "react";
import type { ObjectLayer, TiledMap, TileLayer } from "../types/canvas";
import { useDispatch, useSelector } from "react-redux";
import { updateCurrentUser } from "../Redux/roomState";
import { ensureTilePosition, type TilePosition } from "../lib/helper";
import { useSocket } from "../SocketProvider";
import type { InteractablesMap } from "../Interactables/coreDS";
import type {
  InteractionEvent,
  InteractionManager as InteractionManagerType,
} from "../Interactables/manager";
import { InteractionManager } from "../Interactables/manager";
import type { InteractableObject, SpatialChunk } from "../Interactables/coreDS";
import {
  convertWorkerInteractablesToMap,
  useMapBuilder,
} from "@/workers/useMapBuilder";
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
  playerPosition,
  onInteraction,
  joystickMovement,
}: Props) => {
  const dispatch = useDispatch();
  const socket = useSocket();

  const lastMoveTime = useRef(0);
  const movementCooldown = useRef(150);
  const movementThreshold = useRef(0.3);

  const [interactablesMap, setInteractablesMap] =
    useState<InteractablesMap | null>(null);
  const { closestInteraction } = useSelector(
    (state: RootState) => state.interactionState
  );
  const interactionManagerRef = useRef<InteractionManagerType | null>(null);

  const updatePosition = useCallback(
    (newPos: TilePosition) => {
      const tilePos = ensureTilePosition(newPos);
      dispatch(updateCurrentUser(tilePos));
      if (interactionManagerRef.current) {
        interactionManagerRef.current.updateInteractions(tilePos);
      }
    },
    [dispatch]
  );

  // 🧠 Worker-based map builder
  const {
    collisionMap,
    interactables,
    loading: mapLoading,
  } = useMapBuilder(mapData);

  // 🧮 Convert worker output → proper InteractablesMap
  useEffect(() => {
    if (interactables && interactables.length > 0) {
      const builtMap = convertWorkerInteractablesToMap(interactables);
      setInteractablesMap(builtMap);
    }
  }, [interactables]);
  useEffect(() => {
    console.log("mapBuilt", collisionMap, interactables);
  }, [interactables, collisionMap]);
  // 🧩 Convert flat tiles[] → 2D array for compatibility
  const [collision2D, setCollision2D] = useState<CollisionMap | null>(null);
  useEffect(() => {
    if (
      collisionMap &&
      Array.isArray(collisionMap.tiles) &&
      !Array.isArray(collisionMap.tiles[0])
    ) {
      const { width, height, tiles } = collisionMap as any;
      const twoD: boolean[][] = [];
      for (let y = 0; y < height; y++) {
        twoD.push(tiles.slice(y * width, (y + 1) * width));
      }
      setCollision2D({ width, height, tiles: twoD });
    } else if (collisionMap) {
      setCollision2D(collisionMap as any);
    }
  }, [collisionMap]);

  // ✅ Initialize InteractionManager when interactablesMap is ready
  useEffect(() => {
    if (!interactablesMap || interactablesMap.objects.size === 0) return;

    const manager = new InteractionManager(interactablesMap);
    interactionManagerRef.current = manager;
    

    const unsubscribe = manager.subscribe((event: InteractionEvent) => {
      switch (event.type) {
        case "available":
        case "lost":
          dispatchInteractables(dispatch, manager.getAvailableInteractions());
          const closest = manager.getClosestInteraction(playerPosition);
          dispatchInteractable(dispatch, closest ?? null);
          break;
        case "triggered":
          if (event.object && onInteraction) onInteraction(event);
          break;
      }
    });

    manager.updateInteractions(playerPosition);
    return () => {
      unsubscribe();
      manager.cleanup();
    };
  }, [interactablesMap]);

  // Periodically update interaction proximity
  const lastInteractionUpdate = useRef(0);
  useEffect(() => {
    const now = Date.now();
    if (now - lastInteractionUpdate.current > 100) {
      interactionManagerRef.current?.updateInteractions(playerPosition);
      lastInteractionUpdate.current = now;
    }
  }, [playerPosition]);

  const isValidPosition = useCallback(
    (tilePos: TilePosition): boolean => {
      if (!collision2D) return false;
      if (
        tilePos.x < 0 ||
        tilePos.x >= collision2D.width ||
        tilePos.y < 0 ||
        tilePos.y >= collision2D.height
      ) {
        return false;
      }
      return !collision2D.tiles[tilePos.y][tilePos.x];
    },
    [collision2D]
  );

  // ⌨️ Keyboard movement
  useEffect(() => {
    if (!collision2D) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        (e.target as HTMLElement).isContentEditable
      )
        return;

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
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    playerPosition,
    isValidPosition,
    updatePosition,
    collision2D,
    closestInteraction,
  ]);

  // 🕹️ Joystick movement
  useEffect(() => {
    if (!collision2D || !joystickMovement) return;

    const now = Date.now();
    if (now - lastMoveTime.current < movementCooldown.current) return;

    const { x, y } = joystickMovement;
    const distance = Math.sqrt(x * x + y * y);
    if (distance < movementThreshold.current) return;

    const currentPos = ensureTilePosition(playerPosition);
    let newPos: TilePosition = { ...currentPos };
    const absX = Math.abs(x);
    const absY = Math.abs(y);

    if (absX > absY) {
      newPos.x += x > 0 ? 1 : -1;
    } else {
      newPos.y += y > 0 ? 1 : -1;
    }

    if (isValidPosition(newPos)) {
      updatePosition(newPos);
      socket.emit("user-move", { x: newPos.x, y: newPos.y });
      lastMoveTime.current = now;
    }
  }, [
    joystickMovement,
    collision2D,
    playerPosition,
    isValidPosition,
    updatePosition,
    socket,
  ]);

  return null;
};

// Utility guards for Tiled layers
function isObjectLayer(layer: any): layer is ObjectLayer {
  return layer.type === "objectgroup" && Array.isArray(layer.objects);
}
function isTileLayer(layer: ObjectLayer | TileLayer): layer is TileLayer {
  return layer.type === "tilelayer" && Array.isArray(layer.data);
}

export default Player;

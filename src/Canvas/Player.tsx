import { useEffect, useState, useCallback, useRef } from "react";
import type { ObjectLayer, TiledMap, TileLayer } from "../types/canvas";
import { useDispatch } from "react-redux";
import { updateCurrentUser } from "../Redux/roomState";
import { ensureTilePosition, type TilePosition } from "../lib/utils";
import { useSocket } from "../SocketProvider";

type Props = {
  mapData: TiledMap;
  ctx: CanvasRenderingContext2D | null;
  tilesize: number;
  playerImage: HTMLImageElement | null;
  playerPosition?: { x: number; y: number };
  onPositionChange?: (position: { x: number; y: number }) => void;
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
  playerPosition: externalPosition,
  onPositionChange,
}: Props) => {
  const [collisionMap, setCollisionMap] = useState<CollisionMap | null>(null);
  const dispatch = useDispatch();
  const socket = useSocket();

  // Major mistake in past!!!: Always ensure we're working with tile coordinates
  const playerPosition = externalPosition || { x: 22, y: 10 };

  //   useEffect(() => {
  //   if (externalPosition && isPixelCoordinate(externalPosition)) {
  //     console.warn('⚠️ COORDINATE SYSTEM ISSUE: Received pixel coordinates:', externalPosition);
  //     console.warn('🔧 Converting to tile coordinates:', ensureTilePosition(externalPosition));
  //   }
  // }, [externalPosition]);

  const updatePosition = useCallback(
    (newPos: TilePosition) => {
      const tilePos = ensureTilePosition(newPos);

      console.log("📍 Updating player position to tile:", tilePos);
      dispatch(updateCurrentUser(tilePos));
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

  // Initializes position ONCE and prevent loops
  // useEffect(() => {
  //   if (!collisionMap) return;

  //   console.log("🚀 Initializing player position. Current:", playerPosition);

  //   if (!isValidPosition(playerPosition)) {
  //     console.log("❌ Current position invalid, finding new position...");

  //     const centerX = Math.floor(collisionMap.width / 2);
  //     const centerY = Math.floor(collisionMap.height / 2);

  //     let foundPosition = false;

  //     for (
  //       let radius = 0;
  //       radius < Math.max(collisionMap.width, collisionMap.height) &&
  //       !foundPosition;
  //       radius++
  //     ) {
  //       for (let dx = -radius; dx <= radius && !foundPosition; dx++) {
  //         for (let dy = -radius; dy <= radius && !foundPosition; dy++) {
  //           if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;

  //           const testPos: TilePosition = {
  //             x: centerX + dx,
  //             y: centerY + dy,
  //           };

  //           if (isValidPosition(testPos)) {
  //             console.log("✅ Found valid position:", testPos);
  //             updatePosition(testPos);
  //             foundPosition = true;
  //           }
  //         }
  //       }
  //     }

  //     if (!foundPosition) {
  //       console.warn("⚠️ No valid position found! Using fallback (1,1)");
  //       updatePosition({ x: 1, y: 1 });
  //     }
  //   } else {
  //     console.log("✅ Current position is valid:", playerPosition);
  //   }

  //   }, [collisionMap, isValidPosition, updatePosition]);

  // This part handles movement of character after load
  useEffect(() => {
    if (!collisionMap) return;

    const handleKeyDown = (e: KeyboardEvent) => {
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
  }, [playerPosition, isValidPosition, updatePosition, collisionMap]);

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

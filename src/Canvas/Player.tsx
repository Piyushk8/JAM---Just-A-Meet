import { useEffect, useState, useCallback } from "react";
import type { ObjectLayer, TiledMap, TileLayer } from "../types/canvas";
import { useDispatch } from "react-redux";
import { updateCurrentUser } from "../Redux/roomState";

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
  tiles: boolean[][]; // [y][x] - true means collision
}

const Player = ({
  mapData,
  ctx,
  tilesize,
  playerImage,
  playerPosition: externalPosition,
  onPositionChange,
}: Props) => {
  const [internalPosition, setInternalPosition] = useState({ x: 5, y: 5 });
  const [collisionMap, setCollisionMap] = useState<CollisionMap | null>(null);
  const dispatch = useDispatch();
  // Use external position if provided, otherwise use internal
  const playerPosition = externalPosition || internalPosition;
  const updatePosition = useCallback(
    ({ x, y }: { x: number; y: number }) => {
      dispatch(updateCurrentUser({ x, y }));
    },
    [playerPosition]
  );

  // Build comprehensive collision map
  useEffect(() => {
    if (!mapData) return;

    const map: CollisionMap = {
      width: mapData.width,
      height: mapData.height,
      tiles: Array(mapData.height)
        .fill(null)
        .map(() => Array(mapData.width).fill(false)),
    };

    // console.log(
    //   "Building collision map for",
    //   mapData.width,
    //   "x",
    //   mapData.height
    // );

    // Process all layers
    mapData.layers.forEach((layer, layerIndex) => {
      // console.log(
      //   `Processing layer ${layerIndex}: ${layer.name} (${layer.type})`
      // );
      if (isTileLayer(layer)) {
        // Handle tile layers with collision property
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
        console.log(layer.name, isCollisionLayer);
        if (isCollisionLayer) {
          console.log(`Layer ${layer.name} marked as collision layer`);
          layer.data.forEach((gid, index) => {
            if (gid === 0) return; // 0 means empty tile

            const tileX = index % mapData.width;
            const tileY = Math.floor(index / mapData.width);
            console.log(tileX, tileY);
            if (
              tileX >= 0 &&
              tileX < map.width &&
              tileY >= 0 &&
              tileY < map.height
            ) {
              map.tiles[tileY][tileX] = true;
              console.log(
                `Collision tile at ${tileX},${tileY} from layer ${layer.name}`
              );
            }
          });
        }
      }

      if (isObjectLayer(layer)) {
        // console.log(`Processing object layer: ${(layer as any).name} `);

        // Check layer-level collision property
        const layerHasCollision = layer.properties?.some(
          (prop: any) => prop.name === "collision" && prop.value === true
        );

        // Check if this is a known collision layer
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
        // console.log(layerHasCollision, isKnownCollisionLayer);
        layer.objects.forEach((obj) => {
          // Check object-level collision property
          const objectHasCollision = obj.properties?.some(
            (prop) => prop.name === "collision" && prop.value === true
          );

          const shouldCollide =
            layerHasCollision || isKnownCollisionLayer || objectHasCollision;

          if (shouldCollide && obj.x !== undefined && obj.y !== undefined) {
            // Convert object coordinates to tile coordinates
            // Tiled uses bottom-left anchor for objects, so adjust for that
            const objLeft = Math.floor(obj.x / mapData.tilewidth);
            const objTop = Math.floor(
              (obj.y - (obj.height || mapData.tileheight)) / mapData.tileheight
            );
            const objRight = Math.floor(
              (obj.x + (obj.width || mapData.tilewidth) - 1) / mapData.tilewidth
            );
            const objBottom = Math.floor((obj.y - 1) / mapData.tileheight);
            // console.log(objBottom, objLeft, objRight, objTop);
            // Mark all tiles this object occupies as collision
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
                // console.log(
                //   `Object collision at ${tileX},${tileY} from ${layer.name} object`
                // );
              }
            }
          }
        });
      }
    });

    // Add map boundaries (walls around the entire map)
    for (let x = 0; x < map.width; x++) {
      if (map.tiles[0]) map.tiles[0][x] = true; // Top boundary
      if (map.tiles[map.height - 1]) map.tiles[map.height - 1][x] = true; // Bottom boundary
    }
    for (let y = 0; y < map.height; y++) {
      if (map.tiles[y]) {
        map.tiles[y][0] = true; // Left boundary
        map.tiles[y][map.width - 1] = true; // Right boundary
      }
    }

    // console.log("Collision map built:", map);
    setCollisionMap(map);
  }, [mapData]);

  // Check if a position is valid (not blocked)
  const isValidPosition = useCallback(
    (x: number, y: number): boolean => {
      if (!collisionMap) return false;

      // Check boundaries
      if (
        x < 0 ||
        x >= collisionMap.width ||
        y < 0 ||
        y >= collisionMap.height
      ) {
        return false;
      }

      // Check collision map
      return !collisionMap.tiles[y][x];
    },
    [collisionMap]
  );

  // Find valid starting position
  useEffect(() => {
    if (!collisionMap) return;

    // If current position is invalid, find a valid one
    if (!isValidPosition(playerPosition.x, playerPosition.y)) {
      console.log("Current position is invalid, finding new position...");

      // Try to find a valid position near the center
      const centerX = Math.floor(collisionMap.width / 2);
      const centerY = Math.floor(collisionMap.height / 2);

      // Search in expanding squares around the center
      for (
        let radius = 0;
        radius < Math.max(collisionMap.width, collisionMap.height);
        radius++
      ) {
        for (let dx = -radius; dx <= radius; dx++) {
          for (let dy = -radius; dy <= radius; dy++) {
            if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue; // Only check perimeter

            const testX = centerX + dx;
            const testY = centerY + dy;

            if (isValidPosition(testX, testY)) {
              console.log(`Found valid position: ${testX}, ${testY}`);
              updatePosition({ x: testX, y: testY });
              return;
            }
          }
        }
      }

      console.warn("No valid position found! Using fallback position (1,1)");
      updatePosition({ x: 1, y: 1 });
    }
  }, [collisionMap, playerPosition, isValidPosition, updatePosition]);

  // Handle player movement with smooth collision detection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default arrow key behavior
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

      let newX = playerPosition.x;
      let newY = playerPosition.y;

      switch (e.key.toLowerCase()) {
        case "arrowup":
        case "w":
          newY--;
          break;
        case "arrowdown":
        case "s":
          newY++;
          break;
        case "arrowleft":
        case "a":
          newX--;
          break;
        case "arrowright":
        case "d":
          newX++;
          break;
        default:
          return;
      }

      // Check if the new position is valid
      if (isValidPosition(newX, newY)) {
        updatePosition({ x: newX, y: newY });
        // console.log(`Player moved to ${newX}, ${newY}`);
      } else {
        // console.log(`Movement blocked to ${newX}, ${newY}`);

        // Optional: Play collision sound or effect here
        // You could also implement sliding along walls here
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [playerPosition, isValidPosition, updatePosition]);

  // Debug: Render collision map (optional - remove in production)
  // useEffect(() => {
  //   if (!ctx || !collisionMap || !mapData) return;

  //   // You can enable this for debugging by uncommenting
  //   /*
  //   const debugCanvas = document.createElement('canvas');
  //   debugCanvas.width = collisionMap.width * 2;
  //   debugCanvas.height = collisionMap.height * 2;
  //   const debugCtx = debugCanvas.getContext('2d');
    
  //   if (debugCtx) {
  //     for (let y = 0; y < collisionMap.height; y++) {
  //       for (let x = 0; x < collisionMap.width; x++) {
  //         if (collisionMap.tiles[y][x]) {
  //           debugCtx.fillStyle = 'rgba(255, 0, 0, 0.5)';
  //           debugCtx.fillRect(x * 2, y * 2, 2, 2);
  //         }
  //       }
  //     }
      
  //     // Add debug canvas to DOM temporarily
  //     debugCanvas.style.position = 'absolute';
  //     debugCanvas.style.top = '0';
  //     debugCanvas.style.left = '0';
  //     debugCanvas.style.zIndex = '1000';
  //     debugCanvas.style.border = '1px solid red';
  //     document.body.appendChild(debugCanvas);
      
  //     setTimeout(() => {
  //       document.body.removeChild(debugCanvas);
  //     }, 5000);
  //   }
  //   */
  // }, [collisionMap, ctx, mapData]);

  // Draw player (if not using external rendering)
  // useEffect(() => {
  //   if (!ctx || !playerImage || onPositionChange) return;

  //   // This is handled by parent component in your setup
  //   ctx.drawImage(
  //     playerImage,
  //     playerPosition.x * tilesize,
  //     playerPosition.y * tilesize,
  //     tilesize,
  //     tilesize
  //   );
  // }, [ctx, playerImage, playerPosition, tilesize, onPositionChange]);

  return null;
};

// Helper functions with better type checking
function isObjectLayer(layer: any): layer is ObjectLayer {
  return layer.type === "objectgroup" && Array.isArray(layer.objects);
}

function isTileLayer(layer: ObjectLayer | TileLayer): layer is TileLayer {
  return layer.type === "tilelayer" && Array.isArray(layer.data);
}

export default Player;

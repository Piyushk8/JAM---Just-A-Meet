// mapWorker.ts
// Worker-side code. Must be compiled to a worker (or loaded as blob).
export type WorkerRequest =
  | { type: "buildMap"; mapData: any; options?: { chunkSize?: number } }
  | { type: "terminate" };

export type WorkerResponse =
  | {
      type: "built";
      payload: {
        collisionMap: {
          width: number;
          height: number;
          tiles: boolean[]; // flattened row-major boolean array
        };
        interactables: {
          objects: Array<{
            id: string;
            type: string;
            tiles: string[]; // tile keys like "x,y"
            bounds: { x: number; y: number; width: number; height: number };
            metadata: any;
            interactionRange: number;
          }>;
          // optional spatial grid not included; main thread can build if needed
        };
      };
    }
  | { type: "progress"; message: string; percent?: number }
  | { type: "error"; error: string };

function getTileKey(x: number, y: number) {
  return `${x},${y}`;
}

export function findTilesetForGID(gid: number, tilesets: any[]) {
  // simple search: tilesets with firstgid <= gid, highest firstgid wins
  let chosen = null;
  for (let ts of tilesets) {
    if (ts.firstgid <= gid) {
      if (!chosen || ts.firstgid > chosen.firstgid) chosen = ts;
    }
  }
  if (!chosen) throw new Error("Tileset not found for gid " + gid);
  return chosen;
}

function calculateBoundsFromTiles(tiles: Set<string>) {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (let key of tiles) {
    const [x, y] = key.split(",").map(Number);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

function buildCollisionAndInteractables(mapData: any) {
  const width = mapData.width;
  const height = mapData.height;
  const tiles = new Array<boolean>(width * height).fill(false);

  const objectsOut: any[] = [];
  // iterate layers
  const INTERACTABLE_LAYERS = {
    computer: "computer",
    computers: "computer",
    vendingmachine: "vendingmachine",
    whiteboard: "whiteboard",
    door: "door",
    doors: "door",
  };

  function getInteractableType(layerName: string) {
    if (!layerName) return null;
    const low = layerName.toLowerCase() as keyof typeof INTERACTABLE_LAYERS;
    return (INTERACTABLE_LAYERS[low] as string) || null;
  }

  const layers = Array.isArray(mapData.layers) ? mapData.layers : [];

  // MARK: parse tile layers for collisions & tile-based interactables
  for (let layer of layers) {
    if (layer.type === "tilelayer" && Array.isArray(layer.data)) {
      const props = (layer.properties || []).reduce((acc: any, p: any) => {
        acc[p.name] = p.value;
        return acc;
      }, {});
      const hasCollisionProperty = props["collision"] === true;
      const layerName = layer.name || "";

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
        ].some((k) => layerName.toLowerCase().includes(k));

      if (isCollisionLayer) {
        for (let i = 0; i < layer.data.length; i++) {
          const gid = layer.data[i];
          if (!gid) continue;
          const x = i % width;
          const y = Math.floor(i / width);
          tiles[y * width + x] = true;
        }
      }

      // If this tile layer is named as interactable, group connected tiles into objects
      const interactableType = getInteractableType(layerName);
      if (interactableType) {
        const processed = new Set<string>();
        const data = layer.data;
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            const gid = data[idx];
            if (!gid) continue;
            const key = getTileKey(x, y);
            if (processed.has(key)) continue;

            // BFS flood fill
            const stack = [{ x, y }];
            const connected = new Set<string>();
            while (stack.length) {
              const p = stack.pop()!;
              const kk = getTileKey(p.x, p.y);
              if (p.x < 0 || p.x >= width || p.y < 0 || p.y >= height) continue;
              if (processed.has(kk)) continue;
              const gi = data[p.y * width + p.x];
              if (!gi) continue;
              processed.add(kk);
              connected.add(kk);
              stack.push({ x: p.x + 1, y: p.y });
              stack.push({ x: p.x - 1, y: p.y });
              stack.push({ x: p.x, y: p.y + 1 });
              stack.push({ x: p.x, y: p.y - 1 });
            }

            if (connected.size) {
              const bounds = calculateBoundsFromTiles(connected);
              objectsOut.push({
                id: `${interactableType}_${bounds.x}_${bounds.y}_${Date.now()}`,
                type: interactableType,
                tiles: Array.from(connected),
                bounds,
                metadata: { layer: layerName, gid: data[idx] },
                interactionRange: 1,
              });
            }
          }
        }
      }
    } else if (layer.type === "objectgroup" && Array.isArray(layer.objects)) {
      // object layers: mark collision if flagged and build interactables if layer name indicates
      const layerName = layer.name || "";
      const layerProps = (layer.properties || []).reduce((acc: any, p: any) => {
        acc[p.name] = p.value;
        return acc;
      }, {});
      const layerHasCollision = layerProps["collision"] === true;
      const isInteractableLayer = getInteractableType(layerName);

      for (let obj of layer.objects) {
        // collision
        const objectHasCollision = (obj.properties || []).some(
          (p: any) => p.name === "collision" && p.value === true
        );
        const shouldCollide =
          layerHasCollision ||
          objectHasCollision ||
          ["wall", "chair", "solid"].some((k) =>
            (layerName || "").toLowerCase().includes(k)
          );

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
            let ty = Math.max(0, objTop);
            ty <= Math.min(height - 1, objBottom);
            ty++
          ) {
            for (
              let tx = Math.max(0, objLeft);
              tx <= Math.min(width - 1, objRight);
              tx++
            ) {
              tiles[ty * width + tx] = true;
            }
          }
        }

        // interactable objects
        const t = getInteractableType(layerName);
        if (t) {
          const tileLeft = Math.floor(obj.x / mapData.tilewidth);
          const tileTop = Math.floor(
            (obj.y - (obj.height || mapData.tileheight)) / mapData.tileheight
          );
          const tileRight = Math.floor(
            (obj.x + (obj.width || mapData.tilewidth) - 1) / mapData.tilewidth
          );
          const tileBottom = Math.floor((obj.y - 1) / mapData.tileheight);

          const tilesSet = new Set<string>();
          for (let ty = tileTop; ty <= tileBottom; ty++) {
            for (let tx = tileLeft; tx <= tileRight; tx++) {
              if (tx >= 0 && tx < width && ty >= 0 && ty < height)
                tilesSet.add(getTileKey(tx, ty));
            }
          }

          objectsOut.push({
            id: obj.id ? `${t}_${obj.id}` : `${t}_${obj.x}_${obj.y}`,
            type: t,
            tiles: Array.from(tilesSet),
            bounds: {
              x: tileLeft,
              y: tileTop,
              width: tileRight - tileLeft + 1,
              height: tileBottom - tileTop + 1,
            },
            metadata: {
              name: obj.name || null,
              properties: obj.properties || {},
              original: obj,
            },
            interactionRange:
              (obj.properties || []).find(
                (p: any) => p.name === "interactionRange"
              )?.value || 1,
          });
        }
      }
    }
  }

  // boundaries
  for (let x = 0; x < width; x++) {
    tiles[x] = true;
    tiles[(height - 1) * width + x] = true;
  }
  for (let y = 0; y < height; y++) {
    tiles[y * width + 0] = true;
    tiles[y * width + (width - 1)] = true;
  }

  return {
    collisionMap: { width, height, tiles },
    interactables: { objects: objectsOut },
  };
}

/** Worker message handler */
self.onmessage = function (ev: MessageEvent) {
  const data: WorkerRequest = ev.data;
  if (!data) return;
  if (data.type === "terminate") {
    // @ts-ignore
    self.close();
    return;
  }
  if (data.type === "buildMap") {
    try {
      // optional small progress message
      self.postMessage({ type: "progress", message: "worker: parsing map" });

      const result = buildCollisionAndInteractables(data.mapData);

      self.postMessage({ type: "built", payload: result });
    } catch (err: any) {
      self.postMessage({ type: "error", error: String(err?.message || err) });
    }
  }
};

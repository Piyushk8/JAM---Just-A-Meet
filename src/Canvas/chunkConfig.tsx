import { findTilesetForGID } from "../lib/helper";
import type { TiledMap } from "../types/canvas";

export const CHUNK_SIZE = 512;

export const chunkKey = (cx: number, cy: number) => `${cx}_${cy}`;

export function renderChunk(
  cx: number,
  cy: number,
  cache: React.RefObject<Map<string, HTMLCanvasElement>>,
  mapData: TiledMap,
  tilesetImages: Record<string, HTMLImageElement>
) {
  const key = chunkKey(cx, cy);
  if (cache.current.has(key)) return;

  const chunkCanvas = document.createElement("canvas");
  const ctx = chunkCanvas.getContext("2d");
  if (!ctx) return;

  chunkCanvas.width = CHUNK_SIZE;
  chunkCanvas.height = CHUNK_SIZE;
  ctx.imageSmoothingEnabled = false;

  const startX = cx * CHUNK_SIZE;
  const startY = cy * CHUNK_SIZE;

  mapData.layers.forEach((layer) => {
    if (!layer.visible) return;
    const isCollisionOnly =
      layer.name?.toLowerCase().includes("collision") &&
      !layer.name?.toLowerCase().includes("visual");
    if (isCollisionOnly) return;

    // Tile layers
    if (layer.type === "tilelayer" && layer.data) {
      for (let i = 0; i < layer.data.length; i++) {
        const gid = layer.data[i];
        if (gid === 0) continue;
        const ts = findTilesetForGID(gid, mapData.tilesets);
        const imgKey = ts.image.split("/").pop();
        const img = tilesetImages[imgKey];
        if (!img || !img.complete) continue;

        const localId = gid - ts.firstgid;
        const sx = (localId % ts.columns) * ts.tilewidth;
        const sy = Math.floor(localId / ts.columns) * ts.tileheight;
        const dx = (i % mapData.width) * mapData.tilewidth;
        const dy = Math.floor(i / mapData.width) * mapData.tileheight;

        // Only draw if within this chunk
        if (
          dx >= startX &&
          dx < startX + CHUNK_SIZE &&
          dy >= startY &&
          dy < startY + CHUNK_SIZE
        ) {
          ctx.drawImage(
            img,
            sx,
            sy,
            ts.tilewidth,
            ts.tileheight,
            dx - startX,
            dy - startY,
            ts.tilewidth,
            ts.tileheight
          );
        }
      }
    }

    // Object layers (furniture, decor)
    if (layer.type === "objectgroup" && Array.isArray(layer.objects)) {
      layer.objects.forEach((obj: any) => {
        const gid = obj.gid;
        if (!gid) return;
        const ts = findTilesetForGID(gid, mapData.tilesets);
        const imgKey = ts.image.split("/").pop();
        const img = tilesetImages[imgKey];
        if (!img || !img.complete) return;

        const localId = gid - ts.firstgid;
        const sx = (localId % ts.columns) * ts.tilewidth;
        const sy = Math.floor(localId / ts.columns) * ts.tileheight;
        const dx = obj.x;
        const dy = obj.y - ts.tileheight;

        if (
          dx >= startX &&
          dx < startX + CHUNK_SIZE &&
          dy >= startY &&
          dy < startY + CHUNK_SIZE
        ) {
          ctx.drawImage(
            img,
            sx,
            sy,
            ts.tilewidth,
            ts.tileheight,
            dx - startX,
            dy - startY,
            ts.tilewidth,
            ts.tileheight
          );
        }
      });
    }
  });

  cache.current.set(key, chunkCanvas);
}

import type { ObjectLayer, TiledMap, TileLayer } from "../types/canvas";
import { tileToChunk, getChunkKey, getTileKey } from "./coreDS";
import type {
  InteractablesMap,
  InteractableObject,
  Rectangle,
  InteractablesTypes,
} from "./coreDS";

export class InteractablesMapBuilder {
  private static readonly CHUNK_SIZE = 8; // 8x8 tile chunks for spatial indexing
  private static readonly DEFAULT_INTERACTION_RANGE = 1; // 1 tile range to trigger the interaction

  private static readonly INTERACTABLE_LAYERS: Record<string, string> = {
    computer: "computer",
    computers: "computer",
    vendingmachine: "vendingmachine",
    vendingmachines: "vendingmachine",
    whiteboard: "whiteboard",
    whiteboards: "whiteboard",
    door: "door",
    doors: "door",
  };

  static buildInteractablesMap(mapData: TiledMap): InteractablesMap {
    const interactablesMap: InteractablesMap = {
      objects: new Map(),
      spatialGrid: new Map(),
      tileToObjects: new Map(),
      chunkSize: this.CHUNK_SIZE,
    };

    // console.log("🔧 Building interactables map...");

    // Process all layers
    mapData.layers.forEach((layer) => {
      if (this.isObjectLayer(layer)) {
        this.processObjectLayer(layer, mapData, interactablesMap);
      } else if (this.isTileLayer(layer)) {
        this.processTileLayer(layer, mapData, interactablesMap);
      }
    });

    return interactablesMap;
  }

  private static processObjectLayer(
    layer: ObjectLayer,
    mapData: TiledMap,
    interactablesMap: InteractablesMap
  ): void {
    const layerType = this.getInteractableType(layer.name);
    if (!layerType) return;

    layer.objects.forEach((obj) => {
      if (!obj.x || !obj.y || !obj.width || !obj.height) return;

      // Create unique ID for object
      const objectId = obj.id
        ? `${layerType}_${obj.id}`
        : `${layerType}_${obj.x}_${obj.y}`;

      // Calculate tile bounds
      const tileLeft = Math.floor(obj.x / mapData.tilewidth);
      const tileTop = Math.floor((obj.y - obj.height) / mapData.tileheight);
      const tileRight = Math.floor((obj.x + obj.width - 1) / mapData.tilewidth);
      const tileBottom = Math.floor((obj.y - 1) / mapData.tileheight);

      // Collect all tiles this object occupies
      const tiles = new Set<string>();
      for (let tileY = tileTop; tileY <= tileBottom; tileY++) {
        for (let tileX = tileLeft; tileX <= tileRight; tileX++) {
          tiles.add(getTileKey(tileX, tileY));
        }
      }

      // Create interactable object
      const interactableObject: InteractableObject = {
        id: objectId,
        type: layerType,
        tiles,
        bounds: {
          x: tileLeft,
          y: tileTop,
          width: tileRight - tileLeft + 1,
          height: tileBottom - tileTop + 1,
        },
        metadata: {
          name: obj.name,
          properties: obj.properties || [],
          originalObject: obj,
        },
        interactionRange: this.getInteractionRange(obj.properties),
      };

      this.addObjectToMaps(interactableObject, interactablesMap);
    });
  }

  private static processTileLayer(
    layer: TileLayer,
    mapData: TiledMap,
    interactablesMap: InteractablesMap
  ): void {
    const layerType = this.getInteractableType(layer.name);
    if (!layerType) return;

    // Group adjacent tiles into objects
    const processedTiles = new Set<string>();

    layer.data.forEach((gid, index) => {
      if (gid === 0) return; // Empty tile

      const tileX = index % mapData.width;
      const tileY = Math.floor(index / mapData.width);
      const tileKey = getTileKey(tileX, tileY);

      if (processedTiles.has(tileKey)) return;

      // Find connected component of tiles (flood fill)
      const connectedTiles = this.findConnectedTiles(
        tileX,
        tileY,
        layer,
        mapData,
        processedTiles
      );

      if (connectedTiles.size === 0) return;

      // Create object from connected tiles
      const bounds = this.calculateBounds(connectedTiles);
      const objectId = `${layerType}_${bounds.x}_${bounds.y}_${Date.now()}`;

      const interactableObject: InteractableObject = {
        id: objectId,
        type: layerType,
        tiles: connectedTiles,
        bounds,
        metadata: {
          name: `${layerType}_${bounds.x}_${bounds.y}`,
          properties: (layer as any).properties || [],
          gid,
        },
        interactionRange: this.getInteractionRange((layer as any).properties),
      };

      this.addObjectToMaps(interactableObject, interactablesMap);
    });
  }

  private static findConnectedTiles(
    startX: number,
    startY: number,
    layer: TileLayer,
    mapData: TiledMap,
    processedTiles: Set<string>
  ): Set<string> {
    const connected = new Set<string>();
    const queue = [{ x: startX, y: startY }];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const { x, y } = queue.shift()!;
      const tileKey = getTileKey(x, y);

      if (visited.has(tileKey) || processedTiles.has(tileKey)) continue;
      if (x < 0 || x >= mapData.width || y < 0 || y >= mapData.height) continue;

      const index = y * mapData.width + x;
      const gid = layer.data[index];

      if (gid === 0) continue; // Empty tile

      visited.add(tileKey);
      processedTiles.add(tileKey);
      connected.add(tileKey);

      // Add adjacent tiles to queue
      queue.push(
        { x: x + 1, y },
        { x: x - 1, y },
        { x, y: y + 1 },
        { x, y: y - 1 }
      );
    }

    return connected;
  }

  private static calculateBounds(tiles: Set<string>): Rectangle {
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    tiles.forEach((tileKey) => {
      const [x, y] = tileKey.split(",").map(Number);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    });

    return {
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
    };
  }

  private static addObjectToMaps(
    obj: InteractableObject,
    interactablesMap: InteractablesMap
  ): void {
    // Add to objects map
    interactablesMap.objects.set(obj.id, obj);

    // Add to tile-to-objects mapping
    obj.tiles.forEach((tileKey) => {
      if (!interactablesMap.tileToObjects.has(tileKey)) {
        interactablesMap.tileToObjects.set(tileKey, new Set());
      }
      interactablesMap.tileToObjects.get(tileKey)!.add(obj.id);
    });

    // Add to spatial grid
    const affectedChunks = new Set<string>();

    // Find all chunks that intersect with this object's bounds
    for (let y = obj.bounds.y; y < obj.bounds.y + obj.bounds.height; y++) {
      for (let x = obj.bounds.x; x < obj.bounds.x + obj.bounds.width; x++) {
        const { chunkX, chunkY } = tileToChunk(
          x,
          y,
          interactablesMap.chunkSize
        );
        const chunkKey = getChunkKey(chunkX, chunkY);
        affectedChunks.add(chunkKey);
      }
    }

    affectedChunks.forEach((chunkKey) => {
      if (!interactablesMap.spatialGrid.has(chunkKey)) {
        interactablesMap.spatialGrid.set(chunkKey, { objects: new Set() });
      }
      interactablesMap.spatialGrid.get(chunkKey)!.objects.add(obj.id);
    });
  }

  private static getInteractableType(
    layerName: string
  ): InteractablesTypes | null {
    const lowerName = layerName.toLowerCase();
    return (this.INTERACTABLE_LAYERS[lowerName] as InteractablesTypes) || null;
  }

  private static getInteractionRange(properties: any[] = []): number {
    const rangeProp = properties.find(
      (prop: any) => prop.name === "interactionRange"
    );
    return rangeProp?.value || this.DEFAULT_INTERACTION_RANGE;
  }

  private static isObjectLayer(layer: any): layer is ObjectLayer {
    return layer.type === "objectgroup" && Array.isArray(layer.objects);
  }

  private static isTileLayer(layer: any): layer is TileLayer {
    return layer.type === "tilelayer" && Array.isArray(layer.data);
  }
}

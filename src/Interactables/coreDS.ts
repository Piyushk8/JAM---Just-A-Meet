// Core data structures for the interactables system

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}
export type InteractablesTypes =
  | "computer"
  | "vendingmachine"
  | "whiteboard"
  ;
export interface InteractableObject {
  id: string;                    
  type: InteractablesTypes;                  // "computer", "vendingmachine", "whiteboard", etc.
  tiles: Set<string>;           // "x,y" coordinates this object occupies
  bounds: Rectangle;            // bounding box for quick spatial queries
  metadata: Record<string, any>; // object-specific data from Tiled
  interactionRange: number;     // how close player needs to be (default: 1 tile)
}

export interface InteractionState {
  nearbyObjects: Set<string>;        // object IDs currently in range
  lastInteracted: string | null;     // last object interacted with
  cooldownUntil: number;        
  lastPosition: { x: number; y: number } | null; 
}

export interface SpatialChunk {
  objects: Set<string>;       
}

export interface InteractablesMap {
  objects: Map<string, InteractableObject>;     // objectId -> object data
  spatialGrid: Map<string, SpatialChunk>;      // "chunkX,chunkY" -> chunk data
  tileToObjects: Map<string, Set<string>>;     // "x,y" -> set of object IDs
  chunkSize: number;                           // size of spatial grid chunks
}

//to convert tile coordinates to spatial chunk coordinates
export function tileToChunk(x: number, y: number, chunkSize: number): { chunkX: number; chunkY: number } {
  return {
    chunkX: Math.floor(x / chunkSize),
    chunkY: Math.floor(y / chunkSize)
  };
}

export function getChunkKey(chunkX: number, chunkY: number): string {
  return `${chunkX},${chunkY}`;
}

export function getTileKey(x: number, y: number): string {
  return `${x},${y}`;
}

export function manhattanDistance(
  pos1: { x: number; y: number }, 
  pos2: { x: number; y: number }
): number {
  return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
}

export function isPointInRectangle(point: { x: number; y: number }, rect: Rectangle): boolean {
  return point.x >= rect.x && 
         point.x < rect.x + rect.width && 
         point.y >= rect.y && 
         point.y < rect.y + rect.height;
}
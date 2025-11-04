import type { InteractableObject } from "../Interactables/coreDS";
import type { AppDispatch } from "../Redux";
import {
  setAvailableInteractions,
  setClosestInteraction,
} from "../Redux/interactionState";

export function findTilesetForGID(gid: number, tilesets: any[]) {
  for (let i = tilesets.length - 1; i >= 0; i--) {
    if (gid >= tilesets[i].firstgid) return tilesets[i];
  }
  throw new Error("No tileset found for gid: " + gid);
}

export type TilePosition = {
  x: number;
  y: number;
};

// this is helper function to make the interactions with tiles of types set to array for redux storage
export type serializedInteractableType = Omit<InteractableObject, "tiles"> & {
  tiles: string[];
};

export function serializeInteractable(
  obj: InteractableObject
): serializedInteractableType {
  return {
    ...obj,
    tiles: Array.from(obj.tiles),
  };
}

// this is done to avoid redux serializable issue due to set "tiles"  present in interatable Objects
export const dispatchInteractable = (
  dispatch: AppDispatch,
  obj: InteractableObject | null
) => {
  dispatch(setClosestInteraction(obj ? serializeInteractable(obj) : null));
};
export const dispatchInteractables = (
  dispatch: AppDispatch,
  objects: InteractableObject[] | null
) => {
  dispatch(
    setAvailableInteractions(
      objects?.map((obj) => serializeInteractable(obj) ?? null) || null
    )
  );
};

export const TILE_SIZE = 32;
export function getInteractionLabelPosition(
  interaction: serializedInteractableType | null
) {
  if (!interaction?.bounds) return { x: -9999, y: -9999 };

  const { x, y, width, height } = interaction.bounds;

  // bounds are in tile units → convert to pixels
  const centerX = (x + width / 2) * TILE_SIZE;
  const centerY = (y + height / 2) * TILE_SIZE;

  return {
    x: centerX,
    y: centerY - TILE_SIZE, // a bit above the object
  };
}


/**
 * Converts tile coordinates to pixel coordinates.
 * Example: tile (2, 3) → pixel (64, 96) if TILE_SIZE = 32
 */
export function tileToPixel(tile: { x: number; y: number }) {
  return {
    x: tile.x * TILE_SIZE,
    y: tile.y * TILE_SIZE,
  };
}

/**
 * Converts pixel coordinates to tile coordinates (floor division).
 * Example: pixel (65, 96) → tile (2, 3)
 */
export function pixelToTile(pixel: { x: number; y: number }) {
  return {
    x: Math.floor(pixel.x / TILE_SIZE),
    y: Math.floor(pixel.y / TILE_SIZE),
  };
}

/**
 * Ensures the position is aligned to whole tile coordinates.
 * If already in tile units, returns unchanged; otherwise converts.
 */
export function ensureTilePosition(pos: { x: number; y: number }) {
  // Detect if already tile-aligned
  if (Number.isInteger(pos.x) && Number.isInteger(pos.y)) {
    return pos;
  }
  return pixelToTile(pos);
}

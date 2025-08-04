export const TILE_SIZE = 32; //constant size of tiles according to tiledset

export interface TilePosition {
  x: number; // Tile coordinates (integers)
  y: number;
}

export interface PixelPosition {
  x: number; // Pixel coordinates (floats)
  y: number;
}

/**
 * Convert pixel coordinates to tile coordinates
 * @param pixelPos - Pixel position
 * @returns Tile position (floored integers)
 */
export function pixelToTile(pixelPos: PixelPosition): TilePosition {
  return {
    x: Math.floor(pixelPos.x / TILE_SIZE),
    y: Math.floor(pixelPos.y / TILE_SIZE)
  };
}

/**
 * Convert tile coordinates to pixel coordinates (top-left of tile)
 * @param tilePos - Tile position
 * @returns Pixel position
 */
export function tileToPixel(tilePos: TilePosition): PixelPosition {
  return {
    x: tilePos.x * TILE_SIZE,
    y: tilePos.y * TILE_SIZE
  };
}

/**
 * Convert tile coordinates to centered pixel coordinates
 * @param tilePos - Tile position
 * @returns Pixel position (centered in tile)
 */
export function tileToPixelCentered(tilePos: TilePosition): PixelPosition {
  return {
    x: tilePos.x * TILE_SIZE + TILE_SIZE / 2,
    y: tilePos.y * TILE_SIZE + TILE_SIZE / 2
  };
}

/**
 * Ensure a position is valid tile coordinates
 * @param pos - Position that might be pixel or tile coordinates
 * @returns Valid tile position
 */
export function ensureTilePosition(pos: { x: number; y: number }): TilePosition {
  // If the values are large (likely pixels), convert them
  if (pos.x > 100 || pos.y > 100) {
    return pixelToTile(pos);
  }
  
  // If they're small but floats, floor them to ensure integer tiles
  return {
    x: Math.floor(pos.x),
    y: Math.floor(pos.y)
  };
}

/**
 * Check if a position looks like pixel coordinates vs tile coordinates
 * @param pos - Position to check
 * @returns true if it looks like pixel coordinates
 */
export function isPixelCoordinate(pos: { x: number; y: number }): boolean {
  return pos.x > 100 || pos.y > 100 || pos.x % 1 !== 0 || pos.y % 1 !== 0;
}
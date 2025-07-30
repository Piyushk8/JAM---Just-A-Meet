export function findTilesetForGID(gid: number, tilesets: any[]) {
  for (let i = tilesets.length - 1; i >= 0; i--) {
    if (gid >= tilesets[i].firstgid) return tilesets[i];
  }
  throw new Error("No tileset found for gid: " + gid);
}
// export function findTilesetForGID(gid: number, tilesets: TiledTileset[]) {
//   for (let i = tilesets.length - 1; i >= 0; i--) {
//     if (gid >= tilesets[i].firstgid) return tilesets[i];
//   }
//   throw new Error("No tileset found for gid: " + gid);
// }

// export interface TileLayer {
//   name: string;
//   type: 'tilelayer';
//   data: number[];
//   width: number;
//   height: number;
// }

export interface Tileset {
  firstgid: number;
  source?: string;
  name?: string;
  tilewidth: number;
  tileheight: number;
  image?: string;
  imagewidth?: number;
  imageheight?: number;
  columns?: number;
  tilecount?: number;
}

export interface TiledMap {
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  layers: TileLayer[] | ObjectLayer[];
  tilesets: Tileset[];
}

export type TileLayer = {
  id: number;
  name: string;
  type: "tilelayer";
  data: number[];
  width: number;
  height: number;
  opacity: number;
  visible: boolean;
};

export type ObjectLayer = {
  id: number;
  name: string;
  type: "objectgroup";
  properties: { name: string; value: any; type: string }[];
  objects: {
    properties: { name: string; value: any; type: string }[];
    id: number;
    gid?: number;
    name: string;
    type: string;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    visible: boolean;
  }[];
  opacity: number;
  visible: boolean;
};

// export type TiledMap = {
//   width: number;
//   height: number;
//   tilewidth: number;
//   tileheight: number;
//   tilesets: Tileset[];
//   layers: (TileLayer | ObjectLayer)[];
// };

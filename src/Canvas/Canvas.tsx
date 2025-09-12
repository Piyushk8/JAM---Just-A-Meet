import { useEffect, useState } from "react";
import CanvasRenderer from "./CanvasRenderer";
import type { TiledMap } from "../types/canvas";
import { Sprites, type SpriteNames } from "@/types/types";

export type LoadedCharacter = {
  name: SpriteNames;
  img: HTMLImageElement;
};

export default function Canvas() {
  const [mapData, setMapData] = useState<TiledMap | null>(null);
  const [_tilesetLoaded, setTilesetLoaded] = useState(false);
  const [tilesetImages, setTilesetImages] = useState<
    Record<string, HTMLImageElement>
  >({});
  const [characters, setCharacters] =
    useState<Record<SpriteNames, LoadedCharacter>>();

  //This loads map data
  // useEffect(() => {
  //   fetch(`${"http://localhost:5173"}/assets/map/map.json`)
  //     .then((res) =>{
  //       return res.json()})
  //     .then(setMapData);

  // }, []);

  useEffect(() => {
    fetch("/assets/map/map.json") // relative to same origin
      .then((res) => res.json())
      .then(setMapData);
  }, []);

  // this loads tiledsets
  useEffect(() => {
    if (!mapData) return;

    const loadImages = async () => {
      const loadedImages: Record<string, HTMLImageElement> = {};

      for (const ts of mapData.tilesets) {
        if (!ts.image) continue;
        let img;
        const imagePath = "/assets/tileset/" + ts.image.split("/").pop();
        img = await getImage(imagePath);

        if (!img) {
          const imagePath2 = "/assets/items/" + ts.image.split("/").pop();
          img = await getImage(imagePath2);
        }

        if (!img) continue;
        const filename = ts.image.split("/").pop();
        if (filename) loadedImages[filename] = img;
      }

      setTilesetImages(loadedImages);
      setTilesetLoaded(true);
    };

    loadImages();
    setTilesetLoaded(true);
  }, [mapData]);

  // this loads character sprites
  useEffect(() => {
    const loadCharacters = async () => {
      const loadedChars: Partial<Record<SpriteNames, LoadedCharacter>> = {};

      for (const c of Sprites) {
        const img = await getImage(
          `/assets/character/single/${c}_idle_anim_12.png`
        );
        if (!img) continue;

        loadedChars[c] = {
          name: c,
          img,
        };
      }

      setCharacters(loadedChars as Record<SpriteNames, LoadedCharacter>);
    };
    loadCharacters();
  }, []);
  return (
    <>
      {mapData && Object.keys(tilesetImages).length > 0 && characters && (
        <CanvasRenderer
          characters={characters}
          mapData={mapData}
          tilesetImages={tilesetImages}
        />
      )}
    </>
  );
}
async function getImage(imagePath: string): Promise<HTMLImageElement | null> {
  const img = new Image();
  img.src = imagePath;
  // console.log(imagePath, img);
  const loadedImage = await new Promise<boolean>((resolve) => {
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
  });

  return loadedImage ? img : null;
}

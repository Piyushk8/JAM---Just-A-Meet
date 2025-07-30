import { useEffect, useRef, useState } from "react";
import CanvasRenderer from "./CanvasRenderer";
import type { TiledMap } from "../types/canvas";

export default function Canvas() {
  const [mapData, setMapData] = useState<TiledMap | null>(null);
  const [tilesetLoaded, setTilesetLoaded] = useState(false);
  const [tilesetImages, setTilesetImages] = useState<
    Record<string, HTMLImageElement>
  >({});
  const [characters, setCharacters] = useState<HTMLImageElement[] | null>();

  useEffect(() => {
    // Load the map JSON
    fetch("assets/map/map.json")
      .then((res) => res.json())
      .then(setMapData);

    // Load the image ONCE using ref
  }, []);
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

        // ✅ Store with just the filename as key
        const filename = ts.image.split("/").pop();
        if (filename) loadedImages[filename] = img;
      }

      setTilesetImages(loadedImages);
      setTilesetLoaded(true);
    };

    loadImages();
    setTilesetLoaded(true);
  }, [mapData]);

  useEffect(() => {
    const loadCharacters = async () => {
      let LoadedCharacters = [];
      const chars = ["Adam", "Ash", "Lucy", "Nancy"];
      for (let c of chars) {
        let playerImgPath = `/assets/character/single/${c}_idle_anim_12.png`;
        const loadedImage = await getImage(playerImgPath);
        // console.log(loadedImage);
        if (loadedImage) {
          LoadedCharacters.push(loadedImage);
        }
      }
      setCharacters(LoadedCharacters);
    };
    loadCharacters();
  }, []);
  // console.log(mapData);
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
  console.log(imagePath, img);
  const loadedImage = await new Promise<boolean>((resolve) => {
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false); // ✅ no rejection
  });

  return loadedImage ? img : null;
}

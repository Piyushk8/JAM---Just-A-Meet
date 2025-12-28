import { useEffect, useState } from "react";
import CanvasRenderer from "./CanvasRenderer";
import type { TiledMap } from "../types/canvas";
import { Sprites, type SpriteNames } from "@/types/types";
import { useSelector } from "react-redux";
import type { RootState } from "@/Redux";
import { useSearchParams } from "react-router-dom";
import type { RoomTheme } from "@/types/roomTypes";

export default function Canvas() {
  const [mapData, setMapData] = useState<TiledMap | null>(null);
  const [tilesetImages, setTilesetImages] = useState<
    Record<string, HTMLImageElement>
  >({});
  const [characters, setCharacters] =
    useState<Record<SpriteNames, LoadedCharacter>>();
  const [isLoading, setIsLoading] = useState(true);

  const { roomTheme } = useSelector((state: RootState) => state.roomState);

  const mapNames: Record<RoomTheme, string> = {
    basicoffice: "map.json",
    largeoffice: "LargerOffice1.json",
  };
  useEffect(() => {
    const loadAll = async () => {
      if (!roomTheme) return;
      setIsLoading(true);

      // Load map data
      const mapRes = await fetch(`/assets/map/${mapNames[roomTheme]}`);
      const map = await mapRes.json();
      setMapData(map);

      // Load tilesets
      // Load tilesets
      const loadedImages: Record<string, HTMLImageElement> = {};
      for (const ts of map.tilesets) {
        if (!ts.image) continue;

        const filename = ts.image.split("/").pop();
        if (!filename) continue;

        // Try tileset first
        let img = await getImage(`/assets/tileset/${filename}`);

        // Fallback to items folder if not found
        if (!img) {
          img = await getImage(`/assets/items/${filename}`);
        }

        if (img) loadedImages[filename] = img;
      }
      setTilesetImages(loadedImages);

      setTilesetImages(loadedImages);

      // Load character sprites
      const loadedChars: Record<SpriteNames, LoadedCharacter> = {} as any;
      for (const c of Sprites) {
        const img = await getImage(
          `/assets/character/single/${c}_idle_anim_12.png`
        );
        if (img) loadedChars[c] = { name: c, img };
      }
      setCharacters(loadedChars);

      // All done
      setIsLoading(false);
    };

    loadAll();
  }, [roomTheme]);

  if (
    isLoading ||
    !mapData ||
    Object.keys(tilesetImages).length === 0 ||
    !characters
  ) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50">
        <div className="text-white font-semibold animate-pulse">
          Preparing your room...
        </div>
      </div>
    );
  }
  return (
    <CanvasRenderer
      characters={characters}
      mapData={mapData}
      tilesetImages={tilesetImages}
    />
  );
}

async function getImage(imagePath: string): Promise<HTMLImageElement | null> {
  const img = new Image();
  img.src = imagePath;
  const loaded = await new Promise<boolean>((resolve) => {
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
  });
  return loaded ? img : null;
}

export type LoadedCharacter = {
  name: SpriteNames;
  img: HTMLImageElement;
};

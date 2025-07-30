
// components/CanvasRenderer.tsx - Updated version
import { useEffect, useRef, useState, useCallback } from "react";
import type { TiledMap } from "../types/canvas";
import { findTilesetForGID } from "../lib/helper";
import Player from "./Player";

const TILE_SIZE = 32;

export default function CanvasRenderer({
  mapData,
  tilesetImages,
  characters
}: {
  characters: HTMLImageElement[];
  mapData: TiledMap;
  tilesetImages: Record<string, HTMLImageElement>;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const backgroundCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [playerPosition, setPlayerPosition] = useState({ x: 5, y: 5 });

  // Render the background once (static elements)
  const renderBackground = useCallback(() => {
    if (!mapData || Object.keys(tilesetImages).length === 0 || !backgroundCanvasRef.current) return;

    const bgCanvas = backgroundCanvasRef.current;
    const bgCtx = bgCanvas.getContext("2d");
    if (!bgCtx) return;

    // Set canvas size
    bgCanvas.width = mapData.width * mapData.tilewidth;
    bgCanvas.height = mapData.height * mapData.tileheight;

    // Clear canvas
    bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);

    // Render all layers except collision-only layers
    mapData.layers.forEach((layer) => {
      // Skip pure collision layers (no visual representation)
      const isCollisionOnly = layer.name.toLowerCase().includes("collision") && 
        !layer.name.toLowerCase().includes("visual");

      if (isCollisionOnly) return;

      if (layer.type === "tilelayer") {
        layer.data.forEach((gid, i) => {
          if (gid === 0) return;

          const ts = findTilesetForGID(gid, mapData.tilesets);
          const img = tilesetImages[ts.image.split("/").pop()!];
          if (!img) return;

          const localId = gid - ts.firstgid;
          const sx = (localId % ts.columns) * ts.tilewidth;
          const sy = Math.floor(localId / ts.columns) * ts.tileheight;
          const dx = (i % mapData.width) * mapData.tilewidth;
          const dy = Math.floor(i / mapData.width) * mapData.tileheight;

          bgCtx.drawImage(
            img,
            sx,
            sy,
            ts.tilewidth,
            ts.tileheight,
            dx,
            dy,
            ts.tilewidth,
            ts.tileheight
          );
        });
      }

      if (layer.type === "objectgroup" && Array.isArray((layer as any).objects)) {
        (layer as any).objects.forEach((obj: any) => {
          const gid = obj.gid;
          if (!gid) return;

          const ts = findTilesetForGID(gid, mapData.tilesets);
          const img = tilesetImages[ts.image.split("/").pop()!];
          if (!img) return;

          const localId = gid - ts.firstgid;
          const sx = (localId % ts.columns) * ts.tilewidth;
          const sy = Math.floor(localId / ts.columns) * ts.tileheight;
          const dx = obj.x!;
          const dy = obj.y! - ts.tileheight; // Tiled uses bottom-left anchor

          bgCtx.drawImage(
            img,
            sx,
            sy,
            ts.tilewidth,
            ts.tileheight,
            dx,
            dy,
            ts.tilewidth,
            ts.tileheight
          );
        });
      }
    });
  }, [mapData, tilesetImages]);

  // Render the player on the main canvas
  const renderPlayer = useCallback((ctx: CanvasRenderingContext2D) => {
    if (!characters[0]) return;

    // Clear the main canvas
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Draw background
    if (backgroundCanvasRef.current) {
      ctx.drawImage(backgroundCanvasRef.current, 0, 0);
    }

    // Draw player
    ctx.drawImage(
      characters[0],
      playerPosition.x * TILE_SIZE,
      playerPosition.y * TILE_SIZE,
      TILE_SIZE,
      TILE_SIZE
    );
  }, [characters, playerPosition]);

  // Main render loop
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    renderPlayer(ctx);

    // Continue the render loop
    animationFrameRef.current = requestAnimationFrame(render);
  }, [renderPlayer]);

  // Initialize canvases and start render loop
  useEffect(() => {
    if (!mapData || !canvasRef.current || !backgroundCanvasRef.current || Object.keys(tilesetImages).length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set main canvas size
    canvas.width = mapData.width * mapData.tilewidth;
    canvas.height = mapData.height * mapData.tileheight;

    // Render background once
    renderBackground();

    // Start render loop
    render();

    // Cleanup
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [mapData, tilesetImages, render, renderBackground]);

  return (
    <div className="relative" style={{backgroundColor:"black"}}>
      <div className="flex h-14 w-lg shadow-2xl ring-1 ring-offset-white rounded-b-lg sticky top-2 left-1/2 transform -translate-x-1/2 z-10 text-red-300">
        video section
        <video src=""/>
        <img className="bg-green-200" src="\assets\character\single\Adam_idle_anim_1.png" alt="" />
      </div>
      <div className="h-95vh bg-sky-300">
        {/* Hidden background canvas */}
        <canvas
          ref={backgroundCanvasRef}
          style={{ display: 'none' }}
        />
        
        {/* Main visible canvas */}
        <canvas
          ref={canvasRef}
          width={mapData.width * TILE_SIZE}
          height={mapData.height * TILE_SIZE}
          style={{
            border: "1px solid #ccc",
            imageRendering: "pixelated",
          }}
        />
        
        <Player
          ctx={canvasRef.current?.getContext("2d") || null}
          mapData={mapData}
          tilesize={TILE_SIZE}
          playerImage={characters[0]}
          playerPosition={playerPosition}
          onPositionChange={setPlayerPosition}
        />
      </div>
    </div>
  );
}
import { useEffect, useRef, useCallback } from "react";
import type { TiledMap } from "../types/canvas";
import { findTilesetForGID, getInteractionLabelPosition } from "../lib/helper";
import Player from "./Player";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../Redux";
import { updateCurrentUser } from "../Redux/roomState";
import type { User } from "../types/types";
import { tileToPixel, ensureTilePosition, TILE_SIZE } from "../lib/utils";
import Computer from "./InteractionHandlers/Computer";
import { onInteractionHandler } from "./InteractionHandlers";

export default function CanvasRenderer({
  mapData,
  tilesetImages,
  characters,
}: {
  characters: HTMLImageElement[];
  mapData: TiledMap;
  tilesetImages: Record<string, HTMLImageElement>;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const backgroundCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const { currentUser, usersInRoom } = useSelector(
    (state: RootState) => state.roomState
  );
  const { availableInteractions, closestInteraction } = useSelector(
    (state: RootState) => state.interactionState
  );
  const { isComputer, isVendingMachineOpen, isWhiteBoardOpen } = useSelector(
    (state: RootState) => state.miscSlice
  );
  const dispatch = useDispatch();
  console.log("usersINroom", usersInRoom);
  // Initialize user if not exists - with TILE coordinates
  useEffect(() => {
    if (!currentUser) {
      console.log("🚀 Initializing user with default tile position");
      dispatch(
        updateCurrentUser({
          id: "user-" + Math.random().toString(36).substr(2, 9),
          x: 22, // TILE coordinates, not pixels -- major mistake in past!!!!
          y: 10, // TILE coordinates, not pixels
        })
      );
    }
  }, [currentUser, dispatch]);

  if (!currentUser) {
    return <div>Initializing player...</div>;
  }

  // Render the background
  const renderBackground = useCallback(() => {
    if (
      !mapData ||
      Object.keys(tilesetImages).length === 0 ||
      !backgroundCanvasRef.current
    )
      return;

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
      // Skip pure collision layers
      const isCollisionOnly =
        layer.name.toLowerCase().includes("collision") &&
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

      if (
        layer.type === "objectgroup" &&
        Array.isArray((layer as any).objects)
      ) {
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

  //converts tile coordinates to pixel coordinates for drawing
  const renderPlayer = useCallback(
    (ctx: CanvasRenderingContext2D, player: User) => {
      if (!characters[0] || !player) return;

      // Ensure we have tile coordinates
      const tilePos = ensureTilePosition({ x: player.x, y: player.y });

      // Convert tile coordinates to pixel coordinates for rendering
      const pixelPos = tileToPixel(tilePos);

      // console.log('🎨 Rendering player at tile:', tilePos, 'pixel:', pixelPos);

      // Draw player at pixel position
      ctx.drawImage(
        characters[0],
        pixelPos.x,
        pixelPos.y,
        TILE_SIZE,
        TILE_SIZE
      );
    },
    [characters, usersInRoom]
  );

  // Main render loop
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background
    if (backgroundCanvasRef.current) {
      ctx.drawImage(backgroundCanvasRef.current, 0, 0);
    }

    // Draw all players
    [currentUser, ...Object.values(usersInRoom)].forEach((player) => {
      renderPlayer(ctx, player);
    });

    // Continue the render loop
    animationFrameRef.current = requestAnimationFrame(render);
  }, [currentUser, usersInRoom, renderPlayer]);

  // Initializes canvases and start render loop
  useEffect(() => {
    if (
      !mapData ||
      !canvasRef.current ||
      !backgroundCanvasRef.current ||
      Object.keys(tilesetImages).length === 0
    )
      return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = mapData.width * mapData.tilewidth;
    canvas.height = mapData.height * mapData.tileheight;

    renderBackground();

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [mapData, tilesetImages, render, renderBackground, usersInRoom]);

  return (
    <div className="relative" style={{ backgroundColor: "black" }}>
      <div className="flex h-14 w-lg shadow-2xl ring-1 ring-offset-white rounded-b-lg sticky top-2 left-1/2 transform -translate-x-1/2 z-10 text-red-300">
        <div className="bg-gray-800 px-4 py-2 rounded text-white">
          Player Position: Tile ({currentUser.x}, {currentUser.y})
        </div>
      </div>
      {closestInteraction && (
        <div
          style={{
            position: "absolute",
            left: getInteractionLabelPosition(closestInteraction).x -30,
            bottom: getInteractionLabelPosition(closestInteraction).y,
            transform: "translate(-50%, -100%)", // center horizontally, place above
            background: "rgba(0,0,0,0.7)",
            color: "#fff",
            borderRadius: "4px",
            fontSize: "12px",
          }}
          className="font-mono text-balance px-2 py-1 mb-3"
        >
          Press E
        </div>
      )}
      {isComputer && closestInteraction && (
        <div
          style={{
            position: "absolute",
            left: getInteractionLabelPosition(closestInteraction).x,
            top: getInteractionLabelPosition(closestInteraction).y,
            transform: "translate(-50%, -100%)", // center horizontally, place above
            background: "rgba(0,0,0,0.7)",
            color: "#fff",
            padding: "2px 6px",
            borderRadius: "4px",
            fontSize: "12px",
          }}
          className="font-mono"
        >
          Press E
        </div>
      )}
      <div className="h-95vh bg-sky-300">
        {/* Hidden background canvas */}
        <canvas ref={backgroundCanvasRef} style={{ display: "none" }} />

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
          playerPosition={{ x: currentUser.x, y: currentUser.y }}
          onInteraction={onInteractionHandler}
        />
      </div>
    </div>
  );
}

import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import type { TiledMap } from "../types/canvas";
import { findTilesetForGID, getInteractionLabelPosition } from "../lib/helper";
import Player from "./Player";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../Redux";
import type { SpriteNames, User } from "../types/types";
import {
  tileToPixel,
  ensureTilePosition,
  TILE_SIZE,
  pixelToTile,
} from "../lib/helper";
import { useInteractionHandler } from "./InteractionHandlers";
import Joystick from "@/components/JoyStick";
import MainLoader from "@/components/MainLoader";
import type { LoadedCharacter } from "./Canvas";
import { CHUNK_SIZE, chunkKey, renderChunk } from "./chunkConfig";

const CAMERA_SMOOTH_FACTOR = 0.1;
const CAMERA_DEAD_ZONE = 2;

export default function CanvasRenderer({
  mapData,
  tilesetImages,
  characters,
}: {
  characters: Record<SpriteNames, LoadedCharacter>;
  mapData: TiledMap;
  tilesetImages: Record<string, HTMLImageElement>;
}) {
  const dispatch = useDispatch();
  const onInteractionHandler = useInteractionHandler();

  const backgroundChunks = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [joystickMovement, setJoystickMovement] = useState<{ x: number; y: number } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [camera, setCamera] = useState({ x: 0, y: 0 });
  const [viewport, setViewport] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  const { currentUser, usersInRoom, nearbyParticipants } = useSelector(
    (state: RootState) => state.roomState
  );
  const { loading: userLoading } = useSelector((state: RootState) => state.authSlice);
  const { closestInteraction } = useSelector((state: RootState) => state.interactionState);

  const nearbyUserIds = new Set(nearbyParticipants);
  const shouldRenderRef = useRef<boolean>(true);
  const lastCameraRef = useRef(camera);

  /** 🧹 Cleanup chunks on unmount */
  useEffect(() => {
    return () => {
      backgroundChunks.current.forEach((chunk) => {
        const ctx = chunk.getContext("2d");
        if (ctx) ctx.clearRect(0, 0, chunk.width, chunk.height);
      });
      backgroundChunks.current.clear();
    };
  }, []);

  /** 📏 Debounced resize handling */
  useEffect(() => {
    let timeout: number;
    const handleResize = () => {
      clearTimeout(timeout);
      timeout = window.setTimeout(() => {
        setViewport({
          width: window.innerWidth,
          height: window.innerHeight,
        });
        shouldRenderRef.current = true;
      }, 150);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  /** 📱 Device detection */
  useEffect(() => {
    const checkDeviceType = () => {
      const mobile = window.innerWidth <= 768 || "ontouchstart" in window;
      setIsMobile(mobile);
    };
    checkDeviceType();
    window.addEventListener("resize", checkDeviceType);
    return () => window.removeEventListener("resize", checkDeviceType);
  }, []);

  /** 🎮 Joystick handlers */
  const handleJoystickMove = useCallback((movement: { x: number; y: number }) => {
    setJoystickMovement(movement);
  }, []);

  const handleJoystickEnd = useCallback(() => {
    setJoystickMovement(null);
  }, []);

  /** 🧭 Smooth camera following */
  const updateSmoothCamera = useCallback(() => {
    if (!currentUser || !mapData) return;

    const playerPixelPos = tileToPixel({ x: currentUser.x, y: currentUser.y });
    const targetX = playerPixelPos.x - viewport.width / 2;
    const targetY = playerPixelPos.y - viewport.height / 2;

    const worldWidth = mapData.width * mapData.tilewidth;
    const worldHeight = mapData.height * mapData.tileheight;

    const clampedTargetX = Math.max(0, Math.min(targetX, worldWidth - viewport.width));
    const clampedTargetY = Math.max(0, Math.min(targetY, worldHeight - viewport.height));

    setCamera((prevCamera) => {
      const diffX = clampedTargetX - prevCamera.x;
      const diffY = clampedTargetY - prevCamera.y;

      if (Math.abs(diffX) < CAMERA_DEAD_ZONE && Math.abs(diffY) < CAMERA_DEAD_ZONE) {
        return prevCamera;
      }

      return {
        x: prevCamera.x + diffX * CAMERA_SMOOTH_FACTOR,
        y: prevCamera.y + diffY * CAMERA_SMOOTH_FACTOR,
      };
    });
  }, [currentUser, mapData, viewport.width, viewport.height]);

  /** 🎨 Chunked background rendering */
  const renderVisibleChunks = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      const startChunkX = Math.floor(camera.x / CHUNK_SIZE);
      const startChunkY = Math.floor(camera.y / CHUNK_SIZE);
      const endChunkX = Math.ceil((camera.x + viewport.width) / CHUNK_SIZE);
      const endChunkY = Math.ceil((camera.y + viewport.height) / CHUNK_SIZE);

      for (let cy = startChunkY; cy <= endChunkY; cy++) {
        for (let cx = startChunkX; cx <= endChunkX; cx++) {
          renderChunk(cx, cy, backgroundChunks, mapData, tilesetImages);

          const key = chunkKey(cx, cy);
          const chunkCanvas = backgroundChunks.current.get(key);
          if (!chunkCanvas) continue;

          const screenX = cx * CHUNK_SIZE - camera.x;
          const screenY = cy * CHUNK_SIZE - camera.y;
          ctx.drawImage(chunkCanvas, screenX, screenY);
        }
      }
    },
    [camera, viewport.width, viewport.height, mapData, tilesetImages]
  );

  /** 👤 Player rendering */
  const renderPlayer = useCallback(
    (ctx: CanvasRenderingContext2D, player: User) => {
      let tilePos = ensureTilePosition({ x: player.x, y: player.y });
      if (!tilePos) tilePos = pixelToTile({ x: player.x, y: player.y });

      const pixelPos = tileToPixel(tilePos);
      const screenX = pixelPos.x - camera.x;
      const screenY = pixelPos.y - camera.y;

      const BUFFER = 64;
      if (
        screenX + TILE_SIZE < -BUFFER ||
        screenX > viewport.width + BUFFER ||
        screenY + TILE_SIZE < -BUFFER ||
        screenY > viewport.height + BUFFER
      )
        return;

      const sprite = player.sprite;
      const character = characters[sprite] || characters.Adam;
      if (!character?.img?.complete) return;

      ctx.drawImage(character.img, screenX, screenY, TILE_SIZE, TILE_SIZE);
    },
    [characters, camera, viewport.width, viewport.height]
  );

  /** 🏷️ Player labels */
  const renderAllPlayerLabels = useCallback(
    (ctx: CanvasRenderingContext2D, players: User[]) => {
      ctx.font = "bold 14px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.lineWidth = 3;

      players.forEach((player) => {
        if (!player.username) return;
        const pixelPos = tileToPixel({ x: player.x, y: player.y });
        const screenX = pixelPos.x - camera.x;
        const screenY = pixelPos.y - camera.y;
        const BUFFER = 100;

        if (
          screenX < -BUFFER ||
          screenX > viewport.width + BUFFER ||
          screenY < -BUFFER ||
          screenY > viewport.height + BUFFER
        )
          return;

        const textX = screenX + TILE_SIZE / 2;
        const textY = screenY - 8;

        ctx.strokeStyle = "black";
        ctx.strokeText(player.username, textX, textY);
        ctx.fillStyle = "white";
        ctx.fillText(player.username, textX, textY);
      });
    },
    [camera, viewport.width, viewport.height]
  );

  /** 👥 Combine players */
  const players = useMemo(() => {
    if (!currentUser) return [];
    return [
      currentUser,
      ...Object.values(usersInRoom).filter((p) => p.id !== currentUser.id),
    ].filter(Boolean);
  }, [usersInRoom, currentUser]);

  /** 🎞️ Main render loop */
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    updateSmoothCamera();

    if (!shouldRenderRef.current) {
      animationFrameRef.current = requestAnimationFrame(render);
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    renderVisibleChunks(ctx);

    players.forEach((p) => renderPlayer(ctx, p));
    renderAllPlayerLabels(ctx, players);

    shouldRenderRef.current = false;
    animationFrameRef.current = requestAnimationFrame(render);
  }, [renderVisibleChunks, renderPlayer, renderAllPlayerLabels, players, updateSmoothCamera]);

  /** 🧭 Detect camera change (dirty frame) */
  useEffect(() => {
    const dx = Math.abs(camera.x - lastCameraRef.current.x);
    const dy = Math.abs(camera.y - lastCameraRef.current.y);
    if (dx > 0.5 || dy > 0.5) {
      shouldRenderRef.current = true;
      lastCameraRef.current = camera;
    }
  }, [camera]);

  /** 💤 Handle tab visibility */
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      } else if (!animationFrameRef.current) {
        shouldRenderRef.current = true;
        animationFrameRef.current = requestAnimationFrame(render);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [render]);

  /** 🧱 Clear chunks on map change */
  useEffect(() => {
    backgroundChunks.current.clear();
  }, [mapData]);

  /** 🚀 Start render loop */
  useEffect(() => {
    if (!mapData || !canvasRef.current || Object.keys(tilesetImages).length === 0) return;

    const canvas = canvasRef.current;
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    shouldRenderRef.current = true;
    render();

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    };
  }, [mapData, tilesetImages, render, viewport.width, viewport.height]);

  /** 🧍 Loader fallback */
  if (userLoading || !currentUser) return <MainLoader />;

  return (
    <div className="fixed inset-0 bg-sky-300 overflow-hidden">
      {/* Interaction Label */}
      {closestInteraction && (
        <div
          style={{
            position: "fixed",
            left: getInteractionLabelPosition(closestInteraction).x - camera.x,
            top: getInteractionLabelPosition(closestInteraction).y - camera.y,
            transform: "translate(-50%, -100%)",
            background: "rgba(0,0,0,0.85)",
            color: "#fff",
            padding: "6px 12px",
            borderRadius: "6px",
            fontSize: "16px",
            fontWeight: "bold",
            zIndex: 9999,
            pointerEvents: "none",
            boxShadow: "0 4px 6px rgba(0,0,0,0.3)",
            border: "2px solid rgba(255,255,255,0.3)",
          }}
          className="font-mono select-none"
        >
          Press E
        </div>
      )}

      {/* Game canvas */}
      <div className="flex items-center justify-center w-full h-full">
        <div className="relative w-full h-full">
          <canvas
            ref={canvasRef}
            width={viewport.width}
            height={viewport.height}
            style={{
              border: "1px solid #ccc",
              imageRendering: "pixelated",
              maxWidth: "100%",
              maxHeight: "100%",
            }}
          />
          <Player
            ctx={canvasRef.current?.getContext("2d") || null}
            mapData={mapData}
            tilesize={TILE_SIZE}
            playerImage={characters[currentUser.sprite]?.img ?? characters["Adam"]?.img}
            playerPosition={{ x: currentUser.x, y: currentUser.y }}
            onInteraction={onInteractionHandler}
            joystickMovement={joystickMovement}
          />
        </div>
      </div>

      {isMobile && (
        <div className="absolute bottom-4 left-4 z-50">
          <Joystick onMove={handleJoystickMove} onEnd={handleJoystickEnd} />
        </div>
      )}
    </div>
  );
}

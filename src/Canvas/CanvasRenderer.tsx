import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import type { TiledMap } from "../types/canvas";
import { findTilesetForGID, getInteractionLabelPosition } from "../lib/helper";
import Player from "./Player";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../Redux";
import { updateCurrentUser } from "../Redux/roomState";
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
import { Navigate } from "react-router-dom";

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

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const backgroundCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [backgroundNeedsUpdate, setBackgroundNeedsUpdate] = useState(true);
  const [joystickMovement, setJoystickMovement] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [camera, setCamera] = useState({ x: 0, y: 0 });
  const [viewport, setViewport] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  const { currentUser, usersInRoom, nearbyParticipants } = useSelector(
    (state: RootState) => state.roomState
  );
  const { loading: userLoading } = useSelector(
    (state: RootState) => state.authSlice
  );
  const { closestInteraction } = useSelector(
    (state: RootState) => state.interactionState
  );
  const { isComputer } = useSelector((state: RootState) => state.miscSlice);

  const nearbyUserIds = new Set(nearbyParticipants);

  useEffect(() => {
    console.log(currentUser);
  }, [currentUser]);
  // Handle window resize
  useEffect(() => {
    function handleResize() {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768 || "ontouchstart" in window);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleJoystickMove = useCallback(
    (movement: { x: number; y: number }) => {
      setJoystickMovement(movement);
    },
    []
  );

  const handleJoystickEnd = useCallback(() => {
    setJoystickMovement(null);
  }, []);

  // Smooth camera update
  const updateSmoothCamera = useCallback(() => {
    if (!currentUser || !mapData) return;

    const playerPixelPos = tileToPixel({ x: currentUser.x, y: currentUser.y });
    const targetX = playerPixelPos.x - viewport.width / 2;
    const targetY = playerPixelPos.y - viewport.height / 2;

    const worldWidth = mapData.width * mapData.tilewidth;
    const worldHeight = mapData.height * mapData.tileheight;

    const clampedTargetX = Math.max(
      0,
      Math.min(targetX, worldWidth - viewport.width)
    );
    const clampedTargetY = Math.max(
      0,
      Math.min(targetY, worldHeight - viewport.height)
    );

    setCamera((prevCamera) => {
      const diffX = clampedTargetX - prevCamera.x;
      const diffY = clampedTargetY - prevCamera.y;

      if (
        Math.abs(diffX) < CAMERA_DEAD_ZONE &&
        Math.abs(diffY) < CAMERA_DEAD_ZONE
      ) {
        return prevCamera;
      }

      return {
        x: prevCamera.x + diffX * CAMERA_SMOOTH_FACTOR,
        y: prevCamera.y + diffY * CAMERA_SMOOTH_FACTOR,
      };
    });
  }, [currentUser, mapData, viewport.width, viewport.height]);

  useEffect(() => {
    const intervalId = setInterval(updateSmoothCamera, 16);
    return () => clearInterval(intervalId);
  }, [updateSmoothCamera]);

  // Render tile layer
  const renderTileLayer = useCallback(
    (ctx: CanvasRenderingContext2D, layer: any) => {
      const { data } = layer;
      if (!data) return;

      for (let i = 0; i < data.length; i++) {
        const gid = data[i];
        if (gid === 0) continue;

        try {
          const ts = findTilesetForGID(gid, mapData.tilesets);
          const imgKey = ts.image.split("/").pop();
          const img = tilesetImages[imgKey];

          if (!img || !img.complete) continue;

          const localId = gid - ts.firstgid;
          const sx = (localId % ts.columns) * ts.tilewidth;
          const sy = Math.floor(localId / ts.columns) * ts.tileheight;
          const dx = (i % mapData.width) * mapData.tilewidth;
          const dy = Math.floor(i / mapData.width) * mapData.tileheight;

          ctx.drawImage(
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
        } catch (error) {
          console.warn("Error rendering tile:", error);
          continue;
        }
      }
    },
    [mapData, tilesetImages]
  );

  // Render object layer
  const renderObjectLayer = useCallback(
    (ctx: CanvasRenderingContext2D, layer: any) => {
      if (!layer.objects || !Array.isArray(layer.objects)) return;

      layer.objects.forEach((obj: any) => {
        const gid = obj.gid;
        if (!gid) return;

        try {
          const ts = findTilesetForGID(gid, mapData.tilesets);
          const imgKey = ts.image.split("/").pop();
          const img = tilesetImages[imgKey];

          if (!img || !img.complete) return;

          const localId = gid - ts.firstgid;
          const sx = (localId % ts.columns) * ts.tilewidth;
          const sy = Math.floor(localId / ts.columns) * ts.tileheight;
          const dx = obj.x;
          const dy = obj.y - ts.tileheight;

          ctx.drawImage(
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
        } catch (error) {
          console.warn("Error rendering object:", error);
        }
      });
    },
    [mapData, tilesetImages]
  );

  // Render background
  const renderBackground = useCallback(() => {
    if (!backgroundNeedsUpdate) return;
    if (
      !mapData ||
      Object.keys(tilesetImages).length === 0 ||
      !backgroundCanvasRef.current
    )
      return;

    const bgCanvas = backgroundCanvasRef.current;
    const bgCtx = bgCanvas.getContext("2d");
    if (!bgCtx) return;

    const worldWidth = mapData.width * mapData.tilewidth;
    const worldHeight = mapData.height * mapData.tileheight;

    if (bgCanvas.width !== worldWidth || bgCanvas.height !== worldHeight) {
      bgCanvas.width = worldWidth;
      bgCanvas.height = worldHeight;
    }

    bgCtx.imageSmoothingEnabled = false;
    bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);

    // Ensure layers exist before iterating
    if (!mapData.layers || !Array.isArray(mapData.layers)) return;

    mapData.layers.forEach((layer) => {
      const isCollisionOnly =
        layer.name?.toLowerCase().includes("collision") &&
        !layer.name?.toLowerCase().includes("visual");

      if (isCollisionOnly) return;

      if (layer.type === "tilelayer" && layer.data) {
        renderTileLayer(bgCtx, layer);
      }

      if (
        layer.type === "objectgroup" &&
        Array.isArray((layer as any).objects)
      ) {
        renderObjectLayer(bgCtx, layer);
      }
    });

    setBackgroundNeedsUpdate(false);
  }, [
    mapData,
    tilesetImages,
    backgroundNeedsUpdate,
    renderTileLayer,
    renderObjectLayer,
  ]);

  // Trigger background update when dependencies change
  useEffect(() => {
    setBackgroundNeedsUpdate(true);
  }, [mapData, tilesetImages]);

  // Render player
  const renderPlayer = useCallback(
    (ctx: CanvasRenderingContext2D, player: User) => {
      if (!characters || !player) return;

      let tilePos = ensureTilePosition({ x: player.x, y: player.y });
      if (!tilePos) tilePos = pixelToTile({ x: player.x, y: player.y });

      const pixelPos = tileToPixel(tilePos);
      const screenX = pixelPos.x - camera.x;
      const screenY = pixelPos.y - camera.y;

      // Culling
      const BUFFER = 64;
      if (
        screenX + TILE_SIZE < -BUFFER ||
        screenX > viewport.width + BUFFER ||
        screenY + TILE_SIZE < -BUFFER ||
        screenY > viewport.height + BUFFER
      ) {
        return;
      }

      const sprite = player.sprite;
      const character = characters[sprite] || characters.Adam;

      if (!character?.img || !character.img.complete) return;

      // Draw player sprite
      ctx.drawImage(character.img, screenX, screenY, TILE_SIZE, TILE_SIZE);

      // AV status icons for nearby players
      const isNearby = nearbyUserIds.has(player.id);
      if (isNearby) {
        const iconSize = 12;
        const iconY = screenY - 24;

        // Audio icon
        const audioColor = player.isAudioEnabled ? "#10b981" : "#ef4444";
        const audioBg = player.isAudioEnabled ? "#dcfce7" : "#fee2e2";

        ctx.fillStyle = audioBg;
        ctx.beginPath();
        ctx.arc(
          screenX + TILE_SIZE / 2 - 10,
          iconY,
          iconSize / 2 + 2,
          0,
          Math.PI * 2
        );
        ctx.fill();

        ctx.fillStyle = audioColor;
        ctx.beginPath();
        ctx.arc(
          screenX + TILE_SIZE / 2 - 10,
          iconY,
          iconSize / 2,
          0,
          Math.PI * 2
        );
        ctx.fill();

        // Video icon
        const videoColor = player.isVideoEnabled ? "#10b981" : "#ef4444";
        const videoBg = player.isVideoEnabled ? "#dcfce7" : "#fee2e2";

        //if roundRect is available (newer browsers)
        if (ctx.roundRect) {
          ctx.fillStyle = videoBg;
          ctx.beginPath();
          ctx.roundRect(
            screenX + TILE_SIZE / 2 + 2 - 2,
            iconY - iconSize / 2 - 2,
            iconSize + 4,
            iconSize + 4,
            3
          );
          ctx.fill();

          ctx.fillStyle = videoColor;
          ctx.beginPath();
          ctx.roundRect(
            screenX + TILE_SIZE / 2 + 2,
            iconY - iconSize / 2,
            iconSize,
            iconSize,
            2
          );
          ctx.fill();
        } else {
          // Fallback for older browsers
          ctx.fillStyle = videoBg;
          ctx.fillRect(
            screenX + TILE_SIZE / 2 + 2 - 2,
            iconY - iconSize / 2 - 2,
            iconSize + 4,
            iconSize + 4
          );

          ctx.fillStyle = videoColor;
          ctx.fillRect(
            screenX + TILE_SIZE / 2 + 2,
            iconY - iconSize / 2,
            iconSize,
            iconSize
          );
        }
      }
    },
    [characters, camera, nearbyUserIds, viewport.width, viewport.height]
  );

  const renderAllPlayerLabels = useCallback(
    (ctx: CanvasRenderingContext2D, players: User[]) => {
      ctx.font = "bold 14px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.lineWidth = 3;

      players.forEach((player) => {
        if (!player.username) return;

        let tilePos = ensureTilePosition({ x: player.x, y: player.y });
        if (!tilePos) tilePos = pixelToTile({ x: player.x, y: player.y });

        const pixelPos = tileToPixel(tilePos);
        const screenX = pixelPos.x - camera.x;
        const screenY = pixelPos.y - camera.y;

        // Culling
        const BUFFER = 100;
        if (
          screenX < -BUFFER ||
          screenX > viewport.width + BUFFER ||
          screenY < -BUFFER ||
          screenY > viewport.height + BUFFER
        ) {
          return;
        }

        const textX = screenX + TILE_SIZE / 2;
        const textY = screenY - 8;

        // Username text with outline
        ctx.strokeStyle = "black";
        ctx.strokeText(player.username, textX, textY);
        ctx.fillStyle = "white";
        ctx.fillText(player.username, textX, textY);

        // Status dot
        const dotX = textX + ctx.measureText(player.username).width / 2 + 8;
        const dotY = textY - 8;
        const radius = 4;

        let baseColor;
        switch (player.availability) {
          case "idle":
            baseColor = "#7CFC00";
            break;
          case "away":
            baseColor = "#FFD700";
            break;
          default:
            baseColor = "#EE4B2B";
            break;
        }

        // Save context state
        ctx.save();

        ctx.shadowBlur = 6;
        ctx.shadowColor = baseColor;

        const gradient = ctx.createRadialGradient(
          dotX - 1,
          dotY - 1,
          1,
          dotX,
          dotY,
          radius
        );
        gradient.addColorStop(0, "white");
        gradient.addColorStop(0.3, baseColor);
        gradient.addColorStop(1, "black");

        ctx.beginPath();
        ctx.arc(dotX, dotY, radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.shadowBlur = 0;

        ctx.beginPath();
        ctx.arc(dotX - 1.2, dotY - 1.5, 1.3, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.fill();

        ctx.restore();
      });
    },
    [camera, viewport.width, viewport.height]
  );

  const isInteractionVisible = useCallback(
    (interaction: any) => {
      if (!interaction) return false;

      try {
        const interactionPos = getInteractionLabelPosition(interaction);
        const screenX = interactionPos.x - camera.x;
        const screenY = interactionPos.y - camera.y;

        return (
          screenX >= -100 &&
          screenX <= viewport.width + 100 &&
          screenY >= -100 &&
          screenY <= viewport.height + 100
        );
      } catch (error) {
        console.warn("Error checking interaction visibility:", error);
        return false;
      }
    },
    [camera, viewport.width, viewport.height]
  );

  const players = useMemo(() => {
    if (!currentUser) return [];

    return [
      currentUser,
      ...Object.values(usersInRoom).filter((p) => p.id !== currentUser.id),
    ].filter(Boolean);
  }, [usersInRoom, currentUser]);

  // Main render function
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background
    if (backgroundCanvasRef.current) {
      const bgCanvas = backgroundCanvasRef.current;

      // Calculate safe source rectangle
      const sourceX = Math.max(0, Math.floor(camera.x));
      const sourceY = Math.max(0, Math.floor(camera.y));
      const sourceWidth = Math.min(viewport.width, bgCanvas.width - sourceX);
      const sourceHeight = Math.min(viewport.height, bgCanvas.height - sourceY);

      if (sourceWidth > 0 && sourceHeight > 0) {
        try {
          ctx.drawImage(
            bgCanvas,
            sourceX,
            sourceY,
            sourceWidth,
            sourceHeight,
            0,
            0,
            sourceWidth,
            sourceHeight
          );
        } catch (error) {
          console.warn("Error drawing background:", error);
        }
      }
    }

    // Draw players
    players.forEach((player) => {
      try {
        renderPlayer(ctx, player);
      } catch (error) {
        console.warn("Error rendering player:", player.id, error);
      }
    });

    try {
      renderAllPlayerLabels(ctx, players);
    } catch (error) {
      console.warn("Error rendering player labels:", error);
    }

    animationFrameRef.current = requestAnimationFrame(render);
  }, [
    camera,
    players,
    renderPlayer,
    renderAllPlayerLabels,
    viewport.width,
    viewport.height,
  ]);

  // Main effect to start rendering
  useEffect(() => {
    if (
      !mapData ||
      !canvasRef.current ||
      !backgroundCanvasRef.current ||
      Object.keys(tilesetImages).length === 0
    )
      return;

    const canvas = canvasRef.current;

    // Set canvas size
    if (canvas.width !== viewport.width || canvas.height !== viewport.height) {
      canvas.width = viewport.width;
      canvas.height = viewport.height;
    }

    // Render background and start render loop
    renderBackground();
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [
    mapData,
    tilesetImages,
    renderBackground,
    render,
    viewport.width,
    viewport.height,
  ]);
  if (userLoading || !currentUser) {
    return <MainLoader />;
  }

  // Auth check is done

  return (
    <div className="fixed inset-0 bg-sky-300 overflow-hidden">
      {/* Interaction label for computer users */}
      {isComputer &&
        closestInteraction &&
        isInteractionVisible(closestInteraction) && (
          <div
            style={{
              position: "absolute",
              left: (() => {
                try {
                  return (
                    getInteractionLabelPosition(closestInteraction).x - camera.x
                  );
                } catch {
                  return -9999; // Hide if error
                }
              })(),
              top: (() => {
                try {
                  return (
                    getInteractionLabelPosition(closestInteraction).y - camera.y
                  );
                } catch {
                  return -9999; // Hide if error
                }
              })(),
              transform: "translate(-50%, -100%)",
              background: "rgba(0,0,0,0.7)",
              color: "#fff",
              padding: "2px 6px",
              borderRadius: "4px",
              fontSize: "12px",
              zIndex: 15,
              pointerEvents: "none",
            }}
            className="font-mono"
          >
            Press E
          </div>
        )}

      {/* Game canvas container */}
      <div className="flex items-center justify-center w-full h-full">
        <div className="relative">
          {/* Hidden background canvas */}
          <canvas ref={backgroundCanvasRef} style={{ display: "none" }} />

          {/* Main game canvas */}
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

          {/* Player component */}
          <Player
            ctx={canvasRef.current?.getContext("2d") || null}
            mapData={mapData}
            tilesize={TILE_SIZE}
            playerImage={
              characters[currentUser.sprite]?.img ?? characters["Adam"]?.img
            }
            playerPosition={{ x: currentUser.x, y: currentUser.y }}
            onInteraction={onInteractionHandler}
            joystickMovement={joystickMovement}
          />
        </div>
      </div>

      {/* Mobile joystick */}
      {isMobile && (
        <div className="absolute bottom-4 left-4">
          <Joystick onMove={handleJoystickMove} onEnd={handleJoystickEnd} />
        </div>
      )}
    </div>
  );
}

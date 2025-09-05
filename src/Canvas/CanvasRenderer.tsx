import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import type { TiledMap } from "../types/canvas";
import { findTilesetForGID, getInteractionLabelPosition } from "../lib/helper";
import Player from "./Player";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../Redux";
import { updateCurrentUser } from "../Redux/roomState";
import type { User } from "../types/types";
import {
  tileToPixel,
  ensureTilePosition,
  TILE_SIZE,
  pixelToTile,
} from "../lib/helper";
import { useInteractionHandler } from "./InteractionHandlers";
import Joystick from "@/components/JoyStick";

const CAMERA_SMOOTH_FACTOR = 0.1; // Lower = smoother but slower (0.05-0.15 range)
const CAMERA_DEAD_ZONE = 2; // Pixels - prevents micro-movements

export default function CanvasRenderer({
  mapData,
  tilesetImages,
  characters,
}: {
  characters: HTMLImageElement[];
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

  const { closestInteraction } = useSelector(
    (state: RootState) => state.interactionState
  );
  const { isComputer } = useSelector((state: RootState) => state.miscSlice);
  const nearbyUserIds = new Set(nearbyParticipants);

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

  /**
   * This one takes current user postion according to camera and uses Linear interpolation to smoothely
   * make changes to camera location with moves percent Smooth factor of diff in current to target
   *
   * to prevent jitter
   *
   */
  // Smooth camera update function
  const updateSmoothCamera = useCallback(() => {
    if (!currentUser || !mapData) return;

    // Calculates target camera position
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
  }, [currentUser, mapData]);

  useEffect(() => {
    const intervalId = setInterval(updateSmoothCamera, 16); // ~60fps
    return () => clearInterval(intervalId);
  }, [updateSmoothCamera]);

  useEffect(() => {
    if (!currentUser) {
      console.log("🚀 Initializing user with default tile position");
      dispatch(
        updateCurrentUser({
          id: "user-" + Math.random().toString(36).substr(2, 9),
          x: 22,
          y: 10,
        })
      );
    }
  }, [currentUser, dispatch]);

  if (!currentUser) {
    return <div>Initializing player...</div>;
  }

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

    // current canvas set to map size
    const worldWidth = mapData.width * mapData.tilewidth;
    const worldHeight = mapData.height * mapData.tileheight;

    if (bgCanvas.width !== worldWidth || bgCanvas.height !== worldHeight) {
      bgCanvas.width = worldWidth;
      bgCanvas.height = worldHeight;
    }

    bgCtx.imageSmoothingEnabled = false; // this one controls image quality, currenlty pixelated
    bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);

    mapData.layers.forEach((layer) => {
      const isCollisionOnly =
        layer.name.toLowerCase().includes("collision") &&
        !layer.name.toLowerCase().includes("visual");

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
  }, [mapData, tilesetImages, backgroundNeedsUpdate]);

  const renderTileLayer = useCallback(
    (ctx: CanvasRenderingContext2D, layer: any) => {
      const { data } = layer;

      for (let i = 0; i < data.length; i++) {
        const gid = data[i];
        if (gid === 0) continue;

        const ts = findTilesetForGID(gid, mapData.tilesets);
        const img = tilesetImages[ts.image.split("/").pop()!];
        if (!img) continue;

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
      }
    },
    [mapData, tilesetImages]
  );

  const renderObjectLayer = useCallback(
    (ctx: CanvasRenderingContext2D, layer: any) => {
      layer.objects.forEach((obj: any) => {
        const gid = obj.gid;
        if (!gid) return;

        const ts = findTilesetForGID(gid, mapData.tilesets);
        const img = tilesetImages[ts.image.split("/").pop()!];
        if (!img) return;

        const localId = gid - ts.firstgid;
        const sx = (localId % ts.columns) * ts.tilewidth;
        const sy = Math.floor(localId / ts.columns) * ts.tileheight;
        const dx = obj.x!;
        const dy = obj.y! - ts.tileheight;

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
      });
    },
    [mapData, tilesetImages]
  );

  useEffect(() => {
    setBackgroundNeedsUpdate(true);
  }, [mapData, tilesetImages]);

  // this one renders player sprites for all users in room
  const renderPlayer = useCallback(
    (ctx: CanvasRenderingContext2D, player: User) => {
      if (!characters[0] || !player) return;

      let tilePos = ensureTilePosition({ x: player.x, y: player.y });
      if (!tilePos) tilePos = pixelToTile({ x: player.x, y: player.y });

      const pixelPos = tileToPixel(tilePos);
      const screenX = pixelPos.x - camera.x;
      const screenY = pixelPos.y - camera.y;

      const BUFFER = 32;
      if (
        screenX + TILE_SIZE < -BUFFER ||
        screenX > viewport.width + BUFFER ||
        screenY + TILE_SIZE < -BUFFER ||
        screenY > viewport.height + BUFFER
      ) {
        return;
      }

      // Draw player sprite
      ctx.drawImage(characters[0], screenX, screenY, TILE_SIZE, TILE_SIZE);

      // AV status icons for nearby players
      const isNearby = nearbyUserIds.has(player.id);
      if (isNearby) {
        const iconSize = 12;
        const iconY = screenY - 24;

        // Audio icon
        ctx.fillStyle = player.isAudioEnabled ? "green" : "red";
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
        ctx.fillStyle = player.isVideoEnabled ? "green" : "red";
        ctx.fillRect(
          screenX + TILE_SIZE / 2 + 2,
          iconY - iconSize / 2,
          iconSize,
          iconSize
        );
      }
    },
    [characters, camera, nearbyUserIds]
  );

  const renderAllPlayerLabels = useCallback(
    (ctx: CanvasRenderingContext2D, players: User[]) => {
      ctx.font = "bold 14px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.lineWidth = 3;

      players.forEach((player) => {
        if (!player.username) return;

        // Calculate screen position
        let tilePos = ensureTilePosition({ x: player.x, y: player.y });
        if (!tilePos) tilePos = pixelToTile({ x: player.x, y: player.y });

        const pixelPos = tileToPixel(tilePos);
        const screenX = pixelPos.x - camera.x;
        const screenY = pixelPos.y - camera.y;

        // Culling
        if (
          screenX < -50 ||
          screenX > viewport.width + 50 ||
          screenY < -20 ||
          screenY > viewport.height + 20
        ) {
          return;
        }

        const textX = screenX + TILE_SIZE / 2;
        const textY = screenY - 8;

        // Outline + username text
        ctx.strokeStyle = "black";
        ctx.strokeText(player.username, textX, textY);
        ctx.fillStyle = "white";
        ctx.fillText(player.username, textX, textY);

        // Status dot position
        const dotX = textX + ctx.measureText(player.username).width / 2 + 8;
        const dotY = textY - 8;
        const radius = 4;

        // Base color by availability
        let baseColor;
        switch (player.availability) {
          case "idle":
            baseColor = "#7CFC00";
            break; // bright green
          case "away":
            baseColor = "#FFD700";
            break; // gold
          default:
            baseColor = "#EE4B2B";
            break; // red
        }

        // Glow + shiny gradient
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
      });
    },
    [camera]
  );

  const isInteractionVisible = useCallback(
    (interaction: any) => {
      if (!interaction) return false;

      const interactionPos = getInteractionLabelPosition(interaction);
      const screenX = interactionPos.x - camera.x;
      const screenY = interactionPos.y - camera.y;

      return (
        screenX >= -100 &&
        screenX <= viewport.width + 100 &&
        screenY >= -100 &&
        screenY <= viewport.height + 100
      );
    },
    [camera]
  );

  const players = useMemo(() => {
    return [
      currentUser,
      ...Object.values(usersInRoom).filter((p) => p.id !== currentUser.id),
    ].filter(Boolean);
  }, [usersInRoom, currentUser]);

  // Main render LOGIC
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (backgroundCanvasRef.current) {
      const bgCanvas = backgroundCanvasRef.current;

      // Calculate safe source rectangle
      const sourceX = Math.max(0, Math.floor(camera.x));
      const sourceY = Math.max(0, Math.floor(camera.y));
      const sourceWidth = Math.min(viewport.width, bgCanvas.width - sourceX);
      const sourceHeight = Math.min(viewport.height, bgCanvas.height - sourceY);

      if (sourceWidth > 0 && sourceHeight > 0) {
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
      }
    }

    // Renders all players
    players.forEach((player) => {
      renderPlayer(ctx, player);
    });

    // Renders all labels
    renderAllPlayerLabels(ctx, players);

    animationFrameRef.current = requestAnimationFrame(render);
  }, [camera, players, renderPlayer, renderAllPlayerLabels]);

  useEffect(() => {
    if (
      !mapData ||
      !canvasRef.current ||
      !backgroundCanvasRef.current ||
      Object.keys(tilesetImages).length === 0
    )
      return;

    const canvas = canvasRef.current;

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    renderBackground();
    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [mapData, tilesetImages, renderBackground, render]);

  return (
    <div className="relative w-full h-screen bg-sky-300 overflow-hidden">
      {isComputer &&
        closestInteraction &&
        isInteractionVisible(closestInteraction) && (
          <div
            style={{
              position: "absolute",
              left:
                getInteractionLabelPosition(closestInteraction).x - camera.x,
              top: getInteractionLabelPosition(closestInteraction).y - camera.y,
              transform: "translate(-50%, -100%)",
              background: "rgba(0,0,0,0.7)",
              color: "#fff",
              padding: "2px 6px",
              borderRadius: "4px",
              fontSize: "12px",
              zIndex: 15,
            }}
            className="font-mono"
          >
            Press E
          </div>
        )}

      {/* Game canvas container */}
      <div className="flex items-center justify-center w-full h-full">
        <div className="relative">
          <canvas ref={backgroundCanvasRef} style={{ display: "none" }} />

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
          {closestInteraction && (
            <div
              style={{
                position: "absolute",
                left:
                  getInteractionLabelPosition(closestInteraction).x - camera.x,
                top:
                  getInteractionLabelPosition(closestInteraction).y - camera.y,
                transform: "translate(-50%, -100%)",
                background: "rgba(0,0,0,0.7)",
                color: "#fff",
                padding: "2px 6px",
                borderRadius: "4px",
                fontSize: "12px",
                zIndex: 15,
              }}
              className="font-mono"
            >
              Press E
            </div>
          )}
          <Player
            ctx={canvasRef.current?.getContext("2d") || null}
            mapData={mapData}
            tilesize={TILE_SIZE}
            playerImage={characters[0]}
            playerPosition={{ x: currentUser.x, y: currentUser.y }}
            onInteraction={onInteractionHandler}
            joystickMovement={joystickMovement}
          />
        </div>
      </div>

      {isMobile && (
        <div className="absolute bottom-4 left-4">
          <Joystick onMove={handleJoystickMove} onEnd={handleJoystickEnd} />
        </div>
      )}
    </div>
  );
}

const defaultLiveKitProtocol =
  typeof window !== "undefined" && window.location.protocol === "https:"
    ? "wss"
    : "ws";

export const LIVEKIT_URL =
  import.meta.env.VITE_LIVEKIT_URL ??
  `${defaultLiveKitProtocol}://localhost:7880`;
export const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ?? "http://localhost:3000";

export const ROOM_WIDTH = 1200;
export const ROOM_HEIGHT = 800;

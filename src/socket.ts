import { io, type Socket } from "socket.io-client";
import type { ClientToServer, ServerToClient } from "./types/types";
import { SERVER_URL } from "./lib/consts";

export type SocketType = Socket<ServerToClient , ClientToServer>;

let socket: SocketType | null = null;

export const getSocket = (): SocketType => {
  if (!socket) {
    socket = io(SERVER_URL, {
      autoConnect: false,
      withCredentials: true,
    });
  }
  socket.on("disconnect", (reason) => {
    console.warn("Socket disconnected. Reason:", reason);
  });

  return socket;
};

export const connectSocket = (userId: string) => {
  const sock = getSocket();
  if (!sock.connected) {
    sock.auth = { userId };
    sock.connect();
  }
};

export const disconnectSocket = () => {
  if (socket && socket.connected) {
    socket.disconnect();
    socket = null;
  }
};

let lastSent = 0;
export const emitMoveThrottled = (sock: any, x: number, y: number) => {
  const now = Date.now();
  if (now - lastSent < 50) return;
  lastSent = now;
  sock.emit("user-move", { x, y });
};

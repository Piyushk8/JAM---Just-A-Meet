// socket.ts
import { io } from "socket.io-client";
export const socket =io("http://localhost:3000", { withCredentials: true });

// simple throttle (20 Hz)
export function emitMoveThrottled(x: number, y: number) {
  const now = Date.now();
  if (now - lastSent < 50) return; // 20/s
  lastSent = now;
  socket.emit("user-move", { x, y });
}
let lastSent = 0;

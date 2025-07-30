import React, { useState, useEffect, useRef } from "react";
import io, { Socket } from "socket.io-client";
import "./App.css";
// import { WebRTCManager } from "./lib/utils";
import { socket as socketClient } from "./socket";
import type {
  ClientToServer,
  RoomSyncPayload,
  ServerToClient,
} from "./types/types";
import { LiveKitManager } from "./LiveKit/liveKitManager";
import { fetchLiveKitToken } from "./LiveKit/helper";
import type { Room } from "livekit-client";
import { setCurrentUser, setIsAudioEnabled } from "./Zustand/slice";
import PhaserRoom from "./components/PhaserRoom";
import GameContainer from "./components/Layout/phaserUI";
import Canvas from "./Canvas/Canvas";
interface User {
  id: string;
  username: string;
  x: number;
  y: number;
  distance?: number;
  isAudioEnabled?: boolean;
  isVideoEnabled?: boolean;
}

interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  type: string;
  timestamp: string;
  x: number;
  y: number;
  distance?: number;
}

interface TypingUser {
  userId: string;
  username: string;
  isTyping: boolean;
}

const ROOM_WIDTH = 1200;
const ROOM_HEIGHT = 800;
// worldState.ts
type RemotePlayer = {
  id: string;
  x: number;
  y: number;
  lastSeen: number;
  prevX: number;
  prevY: number;
};

const players: Map<string, RemotePlayer> = new Map();

function App() {
  const [socket, setSocket] = useState<Socket<
    ServerToClient,
    ClientToServer
  > | null>(null);
  const [username, setUsername] = useState(""); // my usernmae
  const [roomId, setRoomId] = useState("room1");
  const [isJoined, setIsJoined] = useState(true);
  const [liveKitManager, setLiveKitManager] = useState<LiveKitManager>(
    new LiveKitManager()
  );

  useEffect(() => {
    const newSocket = io("http://localhost:3000", { withCredentials: true });
    setSocket(newSocket);
    newSocket.on("connect", () => {
      console.log("Connected to server with socket ID:", newSocket.id);
    });
    return () => {
      newSocket.close();
    };
  }, []);

  const joinRoom = async () => {
    if (socket && username.trim()) {
      socket.emit(
        "join-room",
        { roomId, username },
        async (res: { success: boolean }) => {
          if (!res || !res.success) {
            console.log("Error in joining room");
          } else {
            // setting users starting location and adding it to a room
            setCurrentUser({
              id: socket.id!,
              username,
              x: Math.random() * (ROOM_WIDTH - 60),
              y: Math.random() * (ROOM_HEIGHT - 60),
            });
            // getting access token to access the livekit server and rooms
            if (!socket.id) return;
            const token = await fetchLiveKitToken(socket.id, roomId);

            await liveKitManager?.join({
              url: "ws://localhost:7880",
              token,
              enableAudio: true,
              enableVideo: true,
            });
            setIsAudioEnabled(false);
            setIsJoined(true);
            const attachLocalTracks = (room: Room) => {
              const container = document.getElementById("livekit-container");
              if (!container) return;

              // Clear any old video
              container.innerHTML = "";

              room.localParticipant.getTrackPublications().forEach((pub) => {
                if (pub.track) {
                  const el = pub.track.attach();
                  el.muted = true; // prevent echo
                  el.autoplay = true;
                  container.appendChild(el);
                }
              });

              attachLocalTracks(room);
            };
          }
        }
      );
    }
  };

  if (!isJoined) {
    return (
      <div className="login-container">
        <div className="login-form">
          <h1>Join Virtual Office</h1>
          <input
            type="text"
            placeholder="Enter your name"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && joinRoom()}
          />
          <input
            type="text"
            placeholder="Room ID"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
          />
          <button onClick={joinRoom} disabled={!username.trim()}>
            Join Room
          </button>
          <p className="privacy-notice">
            📱 Audio access will be requested for voice chat
          </p>
        </div>
      </div>
    );
  }
  return <Canvas />;
}

export default App;

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import io, { Socket } from "socket.io-client";
import "../App.css";
// import { WebRTCManager } from "./lib/utils";
import { socket as socketClient } from "../socket";
import type {
  ClientToServer,
  RoomSyncPayload,
  ServerToClient,
} from "../types/types";
import { LiveKitManager } from "../LiveKit/liveKitManager";
import { fetchLiveKitToken } from "../LiveKit/helper";
import type { Room } from "livekit-client";
import { setCurrentUser, setIsAudioEnabled } from "../Redux/roomState";
import PhaserRoom from "../components/Room";
import GameContainer from "../components/Layout/phaserUI";
import Canvas from "../Canvas/Canvas";
import { useDispatch } from "react-redux";
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

export const JoinRoom = () => {
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
  const dispatch = useDispatch();
  const nav = useNavigate();

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
            // getting access token to access the livekit server and rooms
            if (!socket.id) return;
            dispatch(
              setCurrentUser({
                id: socket.id,
                username,
                x: Math.random() * 0,
                y: Math.random() * 0,
                socketId: socket.id,
                roomId: roomId,
                isAudioEnabled: false,
                isVideoEnabled: false,
                sprite: "",
              })
            );
            const token = await fetchLiveKitToken(socket.id, roomId);

            await liveKitManager?.join({
              url: "ws://localhost:7880",
              token,
              enableAudio: true,
              enableVideo: true,
            });
            setIsAudioEnabled(false);
            // nav("/r/id")
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

  return (
    <>
      <div className="login-container h-screen w-screen flex items-center justify-center p-4">
        <div className="login-form flex flex-col space-y-5 justify-center items-center ring-1 ring-sky-300 rounded-2xl h-1/2 w-1/2">
          <h1 className="text-4xl font-bold text-balance ">
            Join Virtual Office
          </h1>
          <div className="flex flex-col items-center justify-center gap-8">
            <input
              type="text"
              placeholder="Enter your name"
              value={username}
              className="h-8 w-full rounded-2xl bg-gray-200 p-5 text-gray-800"
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && joinRoom()}
            />
            <input
              type="text"
              placeholder="Room ID"
              value={roomId}
              className="bg-gray-200 h-8 w-full border-2 text-gray-900  border-sky-200 flex items-center justify-center p-5 rounded-2xl"
              onChange={(e) => setRoomId(e.target.value)}
            />
            <button
              className="bg-sky-300 px-4 py-2 hover:bg-white border-sky-300 rounded-2xl border-1 font-semibold hover:text-sky-300 text-white"
              onClick={joinRoom}
              disabled={!username.trim()}
            >
              Join Room
            </button>
          </div>
          <p className="privacy-notice text-red-300 text-balance font-semibold text-sm text-left">
            📱 Audio & Video access will be requested for voice chat
          </p>
        </div>
      </div>
    </>
  );
};

export default JoinRoom;

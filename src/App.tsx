import { BrowserRouter, Route, Routes } from "react-router-dom";
import JoinRoom from "./Pages/JoinRoom";
import Canvas from "./Canvas/Canvas";
import { connectSocket, getSocket } from "./socket";
import PhaserRoom from "./components/Room";
import { SocketProvider } from "./SocketProvider";
import { useMemo } from "react";

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
  const randomUserId = useMemo(() => crypto.randomUUID(), []);

  return (
  
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<JoinRoom />} />
          <Route path="/home" element={<JoinRoom />} />
          <Route path="/r/id" element={<PhaserRoom />} />
        </Routes>
      </BrowserRouter>
  
  );
}

export default App;

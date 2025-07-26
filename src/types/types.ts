export interface userData{
    id:string
    username:string
    x:number
    y:number
    socketId:string
}

export interface User {
  id: string;
  username: string;
  x: number;
  y: number;
  socketId: string;
  roomId: string;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  peerId?: string;
}

export interface Room {
  id: string;
  users: Map<string, User>;
}

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  type: 'text' | 'emoji';
  timestamp: string;
  x: number;
  y: number;
}

export interface TypingUser {
  userId: string;
  username: string;
  isTyping: boolean;
}

export interface ProximityUser extends User {
  distance: number;
}

export type RoomSyncPayload = {
  ts: number;
  me: { x: number; y: number };
  players: Array<{
    id: string;
    x: number;
    y: number;
    username: string;
  }>;
  proximity: {
    entered: string[];
    left: string[];
  };
  audio: Array<{ id: string; level: number }>;
};



export type ServerToClient = {
  "room-users": (users: User[]) => void;
  "user-joined": (user: User) => void;
  "user-left": (userId: string) => void;
  "room-sync": (payload: RoomSyncPayload) => void;
  "user-media-state-changed": (data: {
    userId: string;
    isAudioEnabled: boolean;
    isVideoEnabled: boolean;
  }) => void;
  "message-received": (msg: ChatMessage) => void;
  "message-sent": (msg: ChatMessage) => void;
  "user-typing": (data: TypingUser) => void;
};

export type ClientToServer = {
  "join-room": (
    data: { roomId: string; username: string },
    cb: (res: { success: boolean }) => void
  ) => void;
  "user-move": (data: { x: number; y: number }) => void;
  "media-state-changed": (data: {
    isAudioEnabled: boolean;
    isVideoEnabled: boolean;
  }) => void;
  "send-message": (data: { message: string; type: "text" | "emoji" }) => void;
  "typing-start": () => void;
  "typing-stop": () => void;
};
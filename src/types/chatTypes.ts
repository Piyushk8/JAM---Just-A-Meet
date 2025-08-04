export interface ChatMessage {
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

export interface TypingUser {
  userId: string;
  username: string;
  isTyping: boolean;
}

// worldState.ts
export type RemotePlayer = {
  id: string;
  x: number;
  y: number;
  lastSeen: number;
  prevX: number;
  prevY: number;
};

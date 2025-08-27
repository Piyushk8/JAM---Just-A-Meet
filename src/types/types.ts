export interface userData {
  id: string;
  username: string;
  x: number;
  y: number;
  socketId: string;
}

export type UserAvailabilityStatus = "idle" | "busy" | "away";

export interface UserInfo {
  id:string,
  username:string,
  availability?: UserAvailabilityStatus;
}

export interface User {
  id: string;
  availability: UserAvailabilityStatus;
  username: string;
  x: number;
  y: number;
  socketId: string;
  roomId?: string;
  isAudioEnabled?: boolean;
  isVideoEnabled?: boolean;
  sprite?: string | null;
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
  type: "text" | "emoji";
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
  players: Array<Partial<User>>;
  proximity: {
    entered: string[];
    left: string[];
  };
  audio: Array<{ id: string; level: number }>;
};

export type ConversationUpdatePayload = {
  conversationId: string;
  joined: string;
  left: string;
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
  "incoming-invite": (data: {
    conversationId: string;
    from: string;
    members: string[];
  }) => void;
  "conversation-updated": (data: ConversationUpdatePayload) => void;
  "call-declined": (data: {
    conversationId: string;
    userDeclined: string;
  }) => void;
"call-accepted-response": (data: {
    conversationId: string;
    targetUserId: string;
    conversation?: any;
  }) => void;
};

export type ClientToServer = {
  "join-room": (
    data: { roomId?: string; username: string ,roomName?:string},
    cb: (res: { success: boolean }) => void
  ) => Promise<void>;
  "user-move": (data: { x: number; y: number }) => void;
  "media-state-changed": (data: {
    isAudioEnabled: boolean;
    isVideoEnabled: boolean;
  }) => void;
  "send-message": (data: { message: string; type: "text" | "emoji" }) => void;
  "typing-start": () => void;
  "typing-stop": () => void;
  userStatusChange: (data: { status: UserAvailabilityStatus }) => void;
  "call:invite": (
    { targetUserId }: { targetUserId: string },
    callback: (res: { success: boolean; conversation: Conversation }) => void
  ) => void;
  "call:accept": (
    {
      conversationId,
      targetUserId,
      from,
    }: {
      conversationId: string;
      from: string;
      targetUserId: string;
    },
    cb: (res: {
      isConversationActive: boolean;
      conversation: Conversation | null;
    }) => void
  ) => void;
  "call:decline": ({
    conversationId,
    userDeclined,
    userThatInvited,
  }: {
    conversationId: string;
    userDeclined: string;
    userThatInvited: string;
  }) => void;

  "leave-conversation": ({
    conversationId,
  }: {
    conversationId: string;
  }) => void;
};

// userId used for live kit
export type Identity = string;

export interface Conversation {
  status:"pending" | "ongoing" | "ended"
  members: Identity[];
  pending: Identity[];
  conversationId: string;
  createdAt: number;
  creator: string;
}

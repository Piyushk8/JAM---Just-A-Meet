import React, { useState, useEffect, useRef } from "react";
import io, { Socket } from "socket.io-client";
import "../App.css";
import type {
  ClientToServer,
  RoomSyncPayload,
  ServerToClient,
  User,
} from "../types/types";
import { LiveKitManager } from "../LiveKit/liveKitManager";
import {
  addUserInRoom,
  removeFromUsersInRoom,
  setIsAudioEnabled,
  setIsVideoEnabled,
  updateCurrentUser,
  updateNearbyParticipants,
  updateUsersInRoom,
} from "../Redux/roomState";
import Canvas from "../Canvas/Canvas";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../Redux";

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

export default function PhaserRoom() {
  const [socket, setSocket] = useState<Socket<
    ServerToClient,
    ClientToServer
  > | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [typingUsers, setTypingUsers] = useState<Map<string, TypingUser>>(
    new Map()
  );
  const [showChat, setShowChat] = useState(false);
  // const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  // const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [connectedPeers, setConnectedPeers] = useState<number>(0); // just number of nearby users
  const [liveKitManager, setLiveKitManager] = useState<LiveKitManager>(
    new LiveKitManager()
  );

  const roomRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const {
    currentUser,
    usersInRoom: users,
    nearbyParticipants,
    roomId,
    isAudioEnabled,
    isVideoEnabled,
  } = useSelector((state: RootState) => state.roomState);
  const dispatch = useDispatch();
  useEffect(() => {
    const newSocket = io("http://localhost:3000", { withCredentials: true });
    setSocket(newSocket);
    // setLiveKitManager(new LiveKitManager());

    // Initialize WebRTC Manager
    console.log(newSocket);

    newSocket.on("connect", () => {
      console.log("Connected to server with socket ID:", newSocket.id);
    });
    // to get users in the room on joining
    newSocket.on("room-users", (roomUsers: User[]) => {
      //!make sure to remove current user from it
      dispatch(updateUsersInRoom(roomUsers));
    });

    newSocket.on("user-joined", (user: User) => {
      if (user.id !== newSocket.id) {
        dispatch(addUserInRoom({ userId: user.id, user }));
      }
    });

    newSocket.on("user-left", (userId: string) => {
      dispatch(removeFromUsersInRoom(userId));
      dispatch(updateNearbyParticipants({ left: [userId], joined: null }));
    });

    newSocket.on("room-sync", (payload: RoomSyncPayload) => {
      const { me, players, proximity, audio } = payload;
      // 1) Update my position
      dispatch(updateCurrentUser(me));
      // 2) Upsert players into the global users map
      dispatch(updateUsersInRoom(players));
      // dispatch(setUsersInRoom())
      // 3) Nearby snapshot (full current set, cheap to render UI)
      dispatch(
        updateNearbyParticipants({
          left: proximity.left,
          joined: proximity.entered,
        })
      );
      // dispatch(updateNearbyParticipants(players))
      // 4) A/V proximity management (diff-based)
      liveKitManager?.syncSubscriptions(proximity.entered, proximity.left);

      // setConnectedPeers()
      // 5) Optional spatial falloff
      // liveKitManager?.applyAudioLevels(audio);
    });

    // Media state updates
    newSocket.on(
      "user-media-state-changed",
      ({
        userId,
        isAudioEnabled,
        isVideoEnabled,
      }: {
        userId: string;
        isAudioEnabled: boolean;
        isVideoEnabled: boolean;
      }) => {
        // console.log("herere ", userId, isAudioEnabled, isVideoEnabled);
        dispatch(
          updateUsersInRoom([
            {
              id: userId,
              isAudioEnabled,
              isVideoEnabled,
            },
          ])
        );
      }
    );

    // Chat events
    newSocket.on("message-received", (message: ChatMessage) => {
      setMessages((prev) => [...prev, message].slice(-50)); // Keep last 50 messages
    });

    newSocket.on("message-sent", (message: ChatMessage) => {
      setMessages((prev) => [...prev, message].slice(-50));
    });

    newSocket.on(
      "user-typing",
      ({ userId, username, isTyping }: TypingUser) => {
        setTypingUsers((prev) => {
          const newTyping = new Map(prev);
          if (isTyping) {
            newTyping.set(userId, { userId, username, isTyping });
          } else {
            newTyping.delete(userId);
          }
          return newTyping;
        });
      }
    );

    return () => {
      liveKitManager?.cleanup();
      newSocket.close();
    };
  }, []);

  const toggleAudio = async () => {
    if (liveKitManager) {
      const enabled = await liveKitManager.toggleAudio();
      dispatch(setIsAudioEnabled(enabled));
      socket?.emit("media-state-changed", {
        isAudioEnabled: enabled,
        isVideoEnabled,
      });
    }
  };

  const toggleVideo = async () => {
    if (liveKitManager) {
      const enabled = await liveKitManager.toggleVideo();
      dispatch(setIsVideoEnabled(enabled));
      socket?.emit("media-state-changed", {
        isAudioEnabled,
        isVideoEnabled: enabled,
      });
    }
  };

  const sendMessage = () => {
    if (socket && newMessage.trim()) {
      socket.emit("send-message", {
        message: newMessage.trim(),
        type: "text",
      });
      setNewMessage("");
      stopTyping();
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);

    if (socket) {
      socket.emit("typing-start");

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set new timeout
      typingTimeoutRef.current = setTimeout(() => {
        stopTyping();
      }, 1000);
    }
  };

  const stopTyping = () => {
    if (socket) {
      socket.emit("typing-stop");
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  };

  // if (!isJoined) {
  //   return (
  //     <div className="login-container">
  //       <div className="login-form">
  //         <h1>Join Virtual Office</h1>
  //         <input
  //           type="text"
  //           placeholder="Enter your name"
  //           value={username}
  //           onChange={(e) => setUsername(e.target.value)}
  //           onKeyDown={(e) => e.key === "Enter" && joinRoom()}
  //         />
  //         <input
  //           type="text"
  //           placeholder="Room ID"
  //           value={roomId}
  //           onChange={(e) => setRoomId(e.target.value)}
  //         />
  //         <button onClick={joinRoom} disabled={!username.trim()}>
  //           Join Room
  //         </button>
  //         <p className="privacy-notice">
  //           📱 Audio access will be requested for voice chat
  //         </p>
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <div className="relative">
      {/* Media Controls */}
      <div className="absolute top-4 left-4 z-50 flex space-x-3">
        <button
          className={`media-btn ${isAudioEnabled ? "active" : "inactive"}`}
          onClick={toggleAudio}
        >
          {isAudioEnabled ? "🎤" : "🔇"}
        </button>
        <button
          className={`media-btn ${isVideoEnabled ? "active" : "inactive"}`}
          onClick={toggleVideo}
        >
          {isVideoEnabled ? "📹" : "📷"}
        </button>
      </div>

      {/* Map Canvas (Handles Players, Map, Proximity, etc.) */}
      <Canvas
      // currentUser={currentUser}
      // users={users}
      // nearbyUsers={nearbyUsers}
      // showVideo={isVideoEnabled}
      // showAudio={isAudioEnabled}
      // roomId={roomId}
      />

      {/* Chat Panel */}
      {showChat && (
        <div className="chat-panel absolute right-4 bottom-4 z-50 bg-white rounded shadow-lg w-96 max-h-[60vh] flex flex-col">
          <div className="chat-header flex items-center justify-between px-4 py-2 bg-blue-500 text-white rounded-t">
            <h3 className="text-lg font-semibold">Nearby Chat</h3>
            <button onClick={() => setShowChat(false)}>✕</button>
          </div>

          <div className="chat-messages overflow-y-auto flex-1 p-3 text-sm bg-gray-50">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`chat-message mb-2 ${
                  message.userId === currentUser?.id
                    ? "text-right"
                    : "text-left"
                }`}
              >
                <div className="font-bold">{message.username}</div>
                <div>{message.message}</div>
                {message.distance && (
                  <div className="text-xs text-gray-500">
                    {Math.round(message.distance)}px away
                  </div>
                )}
              </div>
            ))}

            {Array.from(typingUsers.values()).map((typingUser) => (
              <div
                key={typingUser.userId}
                className="typing-indicator text-gray-500 italic text-sm"
              >
                {typingUser.username} is typing...
              </div>
            ))}
          </div>

          <div className="chat-input flex px-3 py-2 border-t">
            <input
              ref={chatInputRef}
              type="text"
              placeholder="Type a message..."
              value={newMessage}
              onChange={handleTyping}
              onKeyPress={(e) => e.key === "Enter" && sendMessage()}
              className="flex-1 px-3 py-1 rounded border border-gray-300 mr-2"
            />
            <button
              onClick={sendMessage}
              disabled={!newMessage.trim()}
              className="px-4 py-1 bg-blue-600 text-white rounded disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

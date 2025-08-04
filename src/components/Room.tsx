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
import { getSocket } from "../socket";
import { useSocket } from "../SocketProvider";

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
  const socket = useSocket();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [typingUsers, setTypingUsers] = useState<Map<string, TypingUser>>(
    new Map()
  );
  const [showChat, setShowChat] = useState(false);
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
    // usersInRoom,
  } = useSelector((state: RootState) => state.roomState);
  const dispatch = useDispatch();

  useEffect(() => {
    const handleRoomUsers = (roomUsers: User[]) => {
      dispatch(updateUsersInRoom(roomUsers));
    };
    const handleConnect = () => {
      console.log("Connected to server with socket ID:", socket.id);
    };
    const handleUserJoined = (user: User) => {
      if (user.id !== socket.id) {
        dispatch(addUserInRoom({ userId: user.id, user }));
      }
    };
    const handleUserLeft = (userId: string) => {
      dispatch(removeFromUsersInRoom(userId));
      dispatch(updateNearbyParticipants({ left: [userId], joined: null }));
    };
    const handleRoomSync = (payload: RoomSyncPayload) => {
      const { me, players, proximity, audio } = payload;
      dispatch(updateCurrentUser(me));
      dispatch(updateUsersInRoom(players));
      dispatch(
        updateNearbyParticipants({
          left: proximity.left,
          joined: proximity.entered,
        })
      );

      liveKitManager?.syncSubscriptions(proximity.entered, proximity.left);
    };

    const handleUserMediaStateChanged = ({
      userId,
      isAudioEnabled,
      isVideoEnabled,
    }: {
      userId: string;
      isAudioEnabled: boolean;
      isVideoEnabled: boolean;
    }) => {
      dispatch(
        updateUsersInRoom([
          {
            id: userId,
            isAudioEnabled,
            isVideoEnabled,
          },
        ])
      );
    };

    const handleMessageReceived = (message: ChatMessage) => {
      setMessages((prev) => [...prev, message].slice(-50));
    };

    const handleMessageSent = (message: ChatMessage) => {
      setMessages((prev) => [...prev, message].slice(-50));
    };

    const handleUserTyping = ({ userId, username, isTyping }: TypingUser) => {
      setTypingUsers((prev) => {
        const newTyping = new Map(prev);
        if (isTyping) {
          newTyping.set(userId, { userId, username, isTyping });
        } else {
          newTyping.delete(userId);
        }
        return newTyping;
      });
    };
    socket.on("connect", handleConnect);
    socket.on("user-joined", handleUserJoined);
    socket.on("user-left", handleUserLeft);
    socket.on("room-sync", handleRoomSync);
    socket.on("user-media-state-changed", handleUserMediaStateChanged);
    socket.on("message-received", handleMessageReceived);
    socket.on("message-sent", handleMessageSent);
    socket.on("user-typing", handleUserTyping);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("user-joined", handleUserJoined);
      socket.off("user-left", handleUserLeft);
      socket.off("room-sync", handleRoomSync);
      socket.off("user-media-state-changed", handleUserMediaStateChanged);
      socket.off("message-received", handleMessageReceived);
      socket.off("message-sent", handleMessageSent);
      socket.off("user-typing", handleUserTyping);

      liveKitManager?.cleanup();
    };
  }, [socket, dispatch, liveKitManager]);

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
      <Canvas />

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

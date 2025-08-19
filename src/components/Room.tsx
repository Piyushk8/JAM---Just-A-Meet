import React, { useState, useEffect, useRef } from "react";
import "../App.css";
import type {
  ConversationUpdatePayload,
  RoomSyncPayload,
  User,
} from "../types/types";
import { liveKitManager } from "../LiveKit/liveKitManager";
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
import { useSocket } from "../SocketProvider";
import UserControls from "./roomComponents/userControls";
import UserControlButton from "./roomComponents/userControlButton";
import NearbyUsers from "./NearbyUserList/NearbyUserList";
import { fetchLiveKitToken } from "@/LiveKit/helper";
import { LIVEKIT_URL } from "@/lib/consts";
import { useParams } from "react-router-dom";
import type { Room } from "livekit-client";

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


export default function PhaserRoom() {
  const socket = useSocket();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [typingUsers, setTypingUsers] = useState<Map<string, TypingUser>>(
    new Map()
  );
  const [Invitation, setInvitation] = useState<{
    conversationId: string;
    from: string;
  } | null>(null);
  const [isConnecting, setIsConnecting] = useState(false)
  const [showChat, setShowChat] = useState(false);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const {
    currentUser,
    roomId,
    isAudioEnabled,
    isVideoEnabled,
    // usersInRoom,
  } = useSelector((state: RootState) => state.roomState);
  const params = useParams();
  const { isUserControlsOpen } = useSelector(
    (state: RootState) => state.miscSlice
  );
  const dispatch = useDispatch();

 const handleConnectToLiveKitRoom = async () => {
  console.log(currentUser?.id, params, isConnecting)
    if (!currentUser?.id || !params.roomId || isConnecting) return;
    if(liveKitManager.room?.state == "connected") return
    try {
      setIsConnecting(true);
      console.log("Connecting to LiveKit room...");
      
      const token = await fetchLiveKitToken(currentUser?.id, params.roomId);
      
      const room = await liveKitManager.join({
        url: LIVEKIT_URL,
        token,
        enableAudio: false,
        enableVideo: false,
      });
      
      // Update Redux state to reflect initial state
      dispatch(setIsAudioEnabled(false));
      dispatch(setIsVideoEnabled(false));
      
      console.log("Successfully connected to LiveKit room");
    } catch (error) {
      console.error("Failed to connect to LiveKit room:", error);
    } finally {
      setIsConnecting(false);
    }
  };

  useEffect(() => {
    if (currentUser?.id &&  params.roomId) {
      handleConnectToLiveKitRoom();
    }
    
    return () => {
      liveKitManager.cleanup();
    };
  }, [params.roomId]);

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

      // liveKitManager?.syncSubscriptions(proximity.entered, proximity.left);
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
    const handleIncomingInvite = ({
      conversationId,
      from,
    }: {
      conversationId: string;
      from: string;
    }) => {
      setInvitation({ conversationId, from });
      console.log("got invitation from", conversationId, from);
      if (currentUser?.id) {
        socket.emit("call:accept", {
          conversationId,
          targetUserId: currentUser?.id,
        });
        console.log("accepted");
      }
    };
    const handleConversationUpdated = ({
      conversationId,
      joined,
      left,
    }: ConversationUpdatePayload) => {
      console.log(
        "syncing for making a connection:",
        conversationId,
        left,
        joined
      );
      if (!conversationId) return;
      liveKitManager.syncSubscriptions([joined], [left]);
    };
    socket.on("connect", handleConnect);
    socket.on("user-joined", handleUserJoined);
    socket.on("user-left", handleUserLeft);
    socket.on("room-sync", handleRoomSync);
    socket.on("user-media-state-changed", handleUserMediaStateChanged);
    socket.on("message-received", handleMessageReceived);
    socket.on("message-sent", handleMessageSent);
    socket.on("user-typing", handleUserTyping);
    socket.on("incoming-invite", handleIncomingInvite);
    socket.on("conversation-updated", handleConversationUpdated);
    return () => {
      socket.off("connect", handleConnect);
      socket.off("user-joined", handleUserJoined);
      socket.off("user-left", handleUserLeft);
      socket.off("room-sync", handleRoomSync);
      socket.off("user-media-state-changed", handleUserMediaStateChanged);
      socket.off("message-received", handleMessageReceived);
      socket.off("message-sent", handleMessageSent);
      socket.off("user-typing", handleUserTyping);
      socket.off("conversation-updated", handleConversationUpdated);
      socket.off("incoming-invite", handleIncomingInvite);

      liveKitManager?.cleanup();
    };
  
  }, [socket, dispatch, liveKitManager]);

  const toggleAudio = async () => {
    if (liveKitManager) {
      await liveKitManager.toggleAudio(!isAudioEnabled);
      // const enabled = await live
      dispatch(setIsAudioEnabled(!isAudioEnabled));
      socket?.emit("media-state-changed", {
        isAudioEnabled: !isAudioEnabled,
        isVideoEnabled,
      });
    }
  };

  const toggleVideo = async () => {
    console.log(!!liveKitManager, liveKitManager.toggleVideo);
    if (liveKitManager) {
      await liveKitManager.toggleVideo(!isVideoEnabled);
      dispatch(setIsVideoEnabled(!isVideoEnabled));
      socket?.emit("media-state-changed", {
        isAudioEnabled,
        isVideoEnabled: !isVideoEnabled,
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

   const connectionStatus = isConnecting 
    ? "Connecting..." 
    : liveKitManager.room 
    ? "Connected" 
    : "Disconnected";

  return (
    <div className="relative">
      {/* LiveKit Container - Enhanced styling */}
      <div
        id="livekit-container"
        className="livekit-container absolute top-0 left-0 z-40 bg-black border border-gray-300 rounded"
        style={{
          width: "300px",
          height: "200px",
          minHeight: "120px"
        }}
      >
        {isConnecting && (
          <div className="flex items-center justify-center h-full text-white">
            Connecting to video...
          </div>
        )}
        {!liveKitManager.room && !isConnecting && (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            Video disconnected
          </div>
        )}
      </div>

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

      {/* userControls */}
      {isUserControlsOpen ? <UserControls /> : <UserControlButton />}

      <NearbyUsers />
      {/* <DrawerDemo/> */}

      {/* Chat Panel */}
      {/* {Invitation && <><div className="" onClick={handleAcc}>Invitation from {Invitation.from} for {Invitation.conversationId}</div></>} */}
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

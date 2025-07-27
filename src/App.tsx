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
  const [users, setUsers] = useState<Map<string, User>>(new Map()); // all users in the room with their postions
  const [currentUser, setCurrentUser] = useState<User | null>(null); // me and my info
  const [username, setUsername] = useState(""); // my usernmae
  const [roomId, setRoomId] = useState("room1");
  const [isJoined, setIsJoined] = useState(false);
  const [nearbyUsers, setNearbyUsers] = useState<User[]>([]); // all of my users in proximity_ threshold (200px)
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [typingUsers, setTypingUsers] = useState<Map<string, TypingUser>>(
    new Map()
  );
  const [showChat, setShowChat] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [connectedPeers, setConnectedPeers] = useState<number>(0); // just number of nearby users
  const [liveKitManager, setLiveKitManager] = useState<LiveKitManager>(
    new LiveKitManager()
  );

  const roomRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const newSocket = io("http://localhost:3000", { withCredentials: true });
    setSocket(newSocket);
    // setLiveKitManager(new LiveKitManager());

    // Initialize WebRTC Manager
    console.log(newSocket);

    newSocket.on("connect", () => {
      console.log("Connected to server with socket ID:", newSocket.id);
    });
    newSocket.on("room-users", (roomUsers: User[]) => {
      const userMap = new Map();
      roomUsers.forEach((user) => {
        if (user.id !== newSocket.id) {
          userMap.set(user.id, user);
        }
      });
      setUsers(userMap);
    });

    newSocket.on("user-joined", (user: User) => {
      if (user.id !== newSocket.id) {
        setUsers((prev) => new Map(prev).set(user.id, user));
      }
    });

    newSocket.on("user-left", (userId: string) => {
      setUsers((prev) => {
        const newUsers = new Map(prev);
        newUsers.delete(userId);
        return newUsers;
      });
      setNearbyUsers((prev) => prev.filter((user) => user.id !== userId));
    });

    newSocket.on("room-sync", (payload: RoomSyncPayload) => {
      const { me, players, proximity, audio } = payload;
      // 1) Update my position
      setCurrentUser((prev) => (prev ? { ...prev, ...me } : prev));
      // 2) Upsert players into the global users map
      setUsers((prev) => {
        const map = new Map(prev);
        for (const p of players) {
          map.set(p.id, { ...map.get(p.id), ...p });
        }
        return map;
      });

      // 3) Nearby snapshot (full current set, cheap to render UI)
      setNearbyUsers(players);
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
        console.log("herere ", userId, isAudioEnabled, isVideoEnabled);
        setUsers((prev) => {
          const newUsers = new Map(prev);
          const user = newUsers.get(userId);
          if (user) {
            newUsers.set(userId, { ...user, isAudioEnabled, isVideoEnabled });
          }
          return newUsers;
        });
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
            setIsJoined(true);

            // Live kit connection

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

  const handleRoomClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!socket || !currentUser) return;

    const rect = roomRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left - 30; // Center the avatar
    const y = e.clientY - rect.top - 30;

    // Constrain to room bounds
    const constrainedX = Math.max(0, Math.min(x, ROOM_WIDTH - 60));
    const constrainedY = Math.max(0, Math.min(y, ROOM_HEIGHT - 60));

    setCurrentUser((prev) =>
      prev ? { ...prev, x: constrainedX, y: constrainedY } : null
    );
    socket.emit("user-move", { x: constrainedX, y: constrainedY });
  };

  const toggleAudio = async () => {
    if (liveKitManager) {
      const enabled = await liveKitManager.toggleAudio();
      setIsAudioEnabled(enabled);
      socket?.emit("media-state-changed", {
        isAudioEnabled: enabled,
        isVideoEnabled,
      });
    }
  };

  const toggleVideo = async () => {
    if (liveKitManager) {
      const enabled = await liveKitManager.toggleVideo();
      setIsVideoEnabled(enabled);
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

  return (
    <div className="app">
      <div className="header">
        <h2>Room: {roomId}</h2>
        <div className="stats">
          <span>Users online: {users.size + 1}</span>
          <span>Nearby: {nearbyUsers.length}</span>
          <span>Connected: {connectedPeers}</span>
          <button
            className={`chat-toggle ${showChat ? "active" : ""}`}
            onClick={() => setShowChat(!showChat)}
          >
            💬 Chat {messages.length > 0 && `(${messages.length})`}
          </button>
        </div>
      </div>

      {/* Media Controls */}
      <div className="media-controls">
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

      {/* LiveKit Video Container */}
      <div
        id="livekit-container"
        className="livekit-video-grid "
        style={{ height: 300, width: 300 , zIndex:1000}}
      ></div>

      <div
        ref={roomRef}
        className="room"
        onClick={handleRoomClick}
        style={{ width: ROOM_WIDTH, height: ROOM_HEIGHT }}
      >
        {/* Current user */}
        {currentUser && (
          <div
            className="user current-user"
            style={{
              left: currentUser.x,
              top: currentUser.y,
            }}
          >
            <div className="avatar">
              👤
              {isAudioEnabled && (
                <div className="audio-indicator active">🎤</div>
              )}
              {isVideoEnabled && (
                <>
                  <div className="video-indicator active">📹</div>
                  <div
                    id="livekit-container"
                    className="livekit-video-grid"
                  ></div>
                </>
              )}
            </div>
            <div className="username">{currentUser.username} (You)</div>
          </div>
        )}

        {/* Other users */}
        {Array.from(users.values()).map((user) => {
          const isNearby = nearbyUsers?.some((nearby) => nearby.id === user.id);
          return (
            <div
              key={user.id}
              className={`user ${isNearby ? "nearby" : ""}`}
              style={{
                left: user.x,
                top: user.y,
              }}
            >
              <div className="avatar">
                👥
                {user.isAudioEnabled && (
                  <div className="audio-indicator active">🎤</div>
                )}
                {user.isVideoEnabled && (
                  <div className="video-indicator active">📹</div>
                )}
              </div>
              <div className="username">{user.username}</div>
              {isNearby && <div className="proximity-indicator">🟢</div>}
            </div>
          );
        })}

        {/* Proximity circles for current user */}
        {currentUser && (
          <>
            <div
              className="proximity-circle chat-range"
              style={{
                left: currentUser.x + 30 - 200,
                top: currentUser.y + 30 - 200,
              }}
            />
            <div
              className="proximity-circle connection-range"
              style={{
                left: currentUser.x + 30 - 150,
                top: currentUser.y + 30 - 150,
              }}
            />
          </>
        )}
      </div>

      {/* Chat Panel */}
      {showChat && (
        <div className="chat-panel">
          <div className="chat-header">
            <h3>Nearby Chat</h3>
            <button onClick={() => setShowChat(false)}>✕</button>
          </div>

          <div className="chat-messages">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`chat-message ${
                  message.userId === currentUser?.id ? "own" : ""
                }`}
              >
                <span className="message-username">{message.username}</span>
                <span className="message-text">{message.message}</span>
                <span className="message-distance">
                  {message.distance
                    ? `${Math.round(message.distance)}px away`
                    : ""}
                </span>
              </div>
            ))}

            {/* Typing indicators */}
            {Array.from(typingUsers.values()).map((typingUser) => (
              <div key={typingUser.userId} className="typing-indicator">
                {typingUser.username} is typing...
              </div>
            ))}
          </div>

          <div className="chat-input">
            <input
              ref={chatInputRef}
              type="text"
              placeholder="Type a message..."
              value={newMessage}
              onChange={handleTyping}
              onKeyPress={(e) => e.key === "Enter" && sendMessage()}
            />
            <button onClick={sendMessage} disabled={!newMessage.trim()}>
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

import React, { useState, useEffect, useRef } from 'react';
import io, { Socket } from 'socket.io-client';
import PhaserRoom from './components/Room';
// import './App.css';
// import { WebRTCManager } from './lib/utils';

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

function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [webRTCManager, setWebRTCManager] = useState<WebRTCManager | null>(null);
  const [users, setUsers] = useState<Map<string, User>>(new Map());
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [username, setUsername] = useState('');
  const [roomId, setRoomId] = useState('room1');
  const [isJoined, setIsJoined] = useState(false);
  const [nearbyUsers, setNearbyUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [typingUsers, setTypingUsers] = useState<Map<string, TypingUser>>(new Map());
  const [showChat, setShowChat] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [connectedPeers, setConnectedPeers] = useState<number>(0);
  const [usePhaserUI, setUsePhaserUI] = useState(true);
  
  const chatInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<any>(null);

  useEffect(() => {
    const newSocket = io('http://localhost:3000');
    setSocket(newSocket);

    // Initialize WebRTC Manager
    const webRTC = new WebRTCManager(newSocket);
    setWebRTCManager(webRTC);

    newSocket.on('room-users', (roomUsers: User[]) => {
      const userMap = new Map();
      roomUsers.forEach(user => {
        if (user.id !== newSocket.id) {
          userMap.set(user.id, user);
        }
      });
      setUsers(userMap);
    });

    newSocket.on('user-joined', (user: User) => {
      if (user.id !== newSocket.id) {
        setUsers(prev => new Map(prev).set(user.id, user));
      }
    });

    newSocket.on('user-moved', ({ userId, x, y }: { userId: string, x: number, y: number }) => {
      setUsers(prev => {
        const newUsers = new Map(prev);
        const user = newUsers.get(userId);
        if (user) {
          newUsers.set(userId, { ...user, x, y });
        }
        return newUsers;
      });
    });

    newSocket.on('user-left', (userId: string) => {
      setUsers(prev => {
        const newUsers = new Map(prev);
        newUsers.delete(userId);
        return newUsers;
      });
      setNearbyUsers(prev => prev.filter(user => user.id !== userId));
    });

    // Proximity events
    newSocket.on('proximity-entered', (user: User) => {
      console.log(`${user.username} entered proximity`);
    });

    newSocket.on('proximity-left', (user: User) => {
      console.log(`${user.username} left proximity`);
    });

    newSocket.on('nearby-users-updated', (nearby: User[]) => {
      setNearbyUsers(nearby);
      setConnectedPeers(nearby.length);
    });

    // Media state updates
    newSocket.on('user-media-state-changed', ({ userId, isAudioEnabled, isVideoEnabled }: { 
      userId: string, 
      isAudioEnabled: boolean, 
      isVideoEnabled: boolean 
    }) => {
      setUsers(prev => {
        const newUsers = new Map(prev);
        const user = newUsers.get(userId);
        if (user) {
          newUsers.set(userId, { ...user, isAudioEnabled, isVideoEnabled });
        }
        return newUsers;
      });
    });

    // Chat events
    newSocket.on('message-received', (message: ChatMessage) => {
      setMessages(prev => [...prev, message].slice(-50));
    });

    newSocket.on('message-sent', (message: ChatMessage) => {
      setMessages(prev => [...prev, message].slice(-50));
    });

    newSocket.on('user-typing', ({ userId, username, isTyping }: TypingUser) => {
      setTypingUsers(prev => {
        const newTyping = new Map(prev);
        if (isTyping) {
          newTyping.set(userId, { userId, username, isTyping });
        } else {
          newTyping.delete(userId);
        }
        return newTyping;
      });
    });

    return () => {
      webRTC.cleanup();
      newSocket.close();
    };
  }, []);

  const joinRoom = async () => {
    if (socket && username.trim()) {
      socket.emit('join-room', { roomId, username });
      setCurrentUser({
        id: socket.id!,
        username,
        x: Math.random() * (ROOM_WIDTH - 60),
        y: Math.random() * (ROOM_HEIGHT - 60)
      });
      setIsJoined(true);

      // Initialize WebRTC with audio enabled by default
      if (webRTCManager) {
        const stream = await webRTCManager.initializeMedia(true, false);
        if (stream) {
          setIsAudioEnabled(true);
        }
      }
    }
  };

  const handleUserMove = (x: number, y: number) => {
    if (!socket || !currentUser) return;

    // Constrain to room bounds
    const constrainedX = Math.max(0, Math.min(x, ROOM_WIDTH - 60));
    const constrainedY = Math.max(0, Math.min(y, ROOM_HEIGHT - 60));

    setCurrentUser(prev => prev ? { ...prev, x: constrainedX, y: constrainedY } : null);
    socket.emit('user-move', { x: constrainedX, y: constrainedY });
  };

  const toggleAudio = async () => {
    if (webRTCManager) {
      const enabled = await webRTCManager.toggleAudio();
      setIsAudioEnabled(enabled);
    }
  };

  const toggleVideo = async () => {
    if (webRTCManager) {
      const enabled = await webRTCManager.toggleVideo();
      setIsVideoEnabled(enabled);
    }
  };

  const sendMessage = () => {
    if (socket && newMessage.trim()) {
      socket.emit('send-message', {
        message: newMessage.trim(),
        type: 'text'
      });
      setNewMessage('');
      stopTyping();
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    
    if (socket) {
      socket.emit('typing-start');
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        stopTyping();
      }, 1000);
    }
  };

  const stopTyping = () => {
    if (socket) {
      socket.emit('typing-stop');
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
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
  
      setCurrentUser(prev => prev ? { ...prev, x: constrainedX, y: constrainedY } : null);
      socket.emit('user-move', { x: constrainedX, y: constrainedY });
    };

  if (!isJoined) {
    return (
      <div className="login-container">
        <div className="login-form">
          <h1>🚀 Kumospace Clone</h1>
          <input
            type="text"
            placeholder="Enter your name"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && joinRoom()}
          />
          <input
            type="text"
            placeholder="Room ID"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
          />
          
          <div className="ui-toggle">
            <label>
              <input
                type="checkbox"
                checked={usePhaserUI}
                onChange={(e) => setUsePhaserUI(e.target.checked)}
              />
              Use High-Performance Phaser UI
            </label>
          </div>
          
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
        <h2>🚀 Room: {roomId}</h2>
        <p>Click anywhere to move around • {usePhaserUI ? 'Phaser UI' : 'HTML UI'}</p>
        <div className="stats">
          <span>Users online: {users.size + 1}</span>
          <span>Nearby: {nearbyUsers.length}</span>
          <span>Connected: {connectedPeers}</span>
          <button 
            className={`chat-toggle ${showChat ? 'active' : ''}`}
            onClick={() => setShowChat(!showChat)}
          >
            💬 Chat {messages.length > 0 && `(${messages.length})`}
          </button>
          <button 
            className="ui-switch"
            onClick={() => setUsePhaserUI(!usePhaserUI)}
            title="Switch between HTML and Phaser UI"
          >
            {usePhaserUI ? '🎮→🌐' : '🌐→🎮'}
          </button>
        </div>
      </div>

      {/* Media Controls */}
      <div className="media-controls">
        <button 
          className={`media-btn ${isAudioEnabled ? 'active' : 'inactive'}`}
          onClick={toggleAudio}
          title={isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
        >
          {isAudioEnabled ? '🎤' : '🔇'}
        </button>
        <button 
          className={`media-btn ${isVideoEnabled ? 'active' : 'inactive'}`}
          onClick={toggleVideo}
          title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
        >
          {isVideoEnabled ? '📹' : '📷'}
        </button>
      </div>

      {/* Room Component - Switch between Phaser and HTML */}
      {usePhaserUI ? (
        <PhaserRoom
          socket={socket}
          currentUser={currentUser}
          users={users}
          nearbyUsers={nearbyUsers}
          onUserMove={handleUserMove}
        />
      ) : (
        <HTMLRoom
          currentUser={currentUser}
          users={users}
          nearbyUsers={nearbyUsers}
          onRoomClick={handleRoomClick}
        />
      )}

      {/* Chat Panel */}
      {showChat && (
        <div className="chat-panel">
          <div className="chat-header">
            <h3>Nearby Chat</h3>
            <button onClick={() => setShowChat(false)}>✕</button>
          </div>
          
          <div className="chat-messages">
            {messages.map(message => (
              <div 
                key={message.id} 
                className={`chat-message ${message.userId === currentUser?.id ? 'own' : ''}`}
              >
                <span className="message-username">{message.username}</span>
                <span className="message-text">{message.message}</span>
                <span className="message-distance">
                  {message.distance ? `${Math.round(message.distance)}px away` : ''}
                </span>
              </div>
            ))}
            
            {/* Typing indicators */}
            {Array.from(typingUsers.values()).map(typingUser => (
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
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
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

// HTML Room Component (original implementation)
interface HTMLRoomProps {
  currentUser: User | null;
  users: Map<string, User>;
  nearbyUsers: User[];
  onRoomClick: (e: React.MouseEvent<HTMLDivElement>) => void;
}

const HTMLRoom: React.FC<HTMLRoomProps> = ({ currentUser, users, nearbyUsers, onRoomClick }) => {
  return (
    <div 
      className="room" 
      onClick={onRoomClick}
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
            {currentUser.isAudioEnabled && <div className="audio-indicator active">🎤</div>}
            {currentUser.isVideoEnabled && <div className="video-indicator active">📹</div>}
          </div>
          <div className="username">{currentUser.username} (You)</div>
        </div>
      )}

      {/* Other users */}
      {Array.from(users.values()).map(user => {
        const isNearby = nearbyUsers.some(nearby => nearby.id === user.id);
        return (
          <div
            key={user.id}
            className={`user ${isNearby ? 'nearby' : ''}`}
            style={{
              left: user.x,
              top: user.y,
            }}
          >
            <div className="avatar">
              👥
              {user.isAudioEnabled && <div className="audio-indicator active">🎤</div>}
              {user.isVideoEnabled && <div className="video-indicator active">📹</div>}
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
  );
};

export default App;
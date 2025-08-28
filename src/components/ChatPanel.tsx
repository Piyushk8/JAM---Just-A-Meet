import type { RootState } from "@/Redux";
import { useSocket } from "@/SocketProvider";
import type { ChatMessage, TypingUser } from "@/types/chatTypes";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSelector } from "react-redux";
import { motion, AnimatePresence } from "motion/react";

const ChatPanel = () => {
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<Map<string, TypingUser>>(
    new Map()
  );
  const [newMessage, setNewMessage] = useState("");
  const socket = useSocket();
  const { currentUser } = useSelector((state: RootState) => state.roomState);

  const chatInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const sendMessage = useCallback(() => {
    if (!newMessage.trim() || !currentUser) return;

    const msg: ChatMessage = {
      id: `${Date.now()}-${currentUser.id}`,
      userId: currentUser.id,
      username: currentUser.username,
      message: newMessage,
      distance: 0,
      timestamp: Date.now(),
      roomId: currentUser.roomId!,
      type: "text",
      x: currentUser.x,
      y: currentUser.y,
    };

    setMessages((prev) => [...prev, msg]);
    socket.emit("chat:message", msg);

    setNewMessage("");
    if (chatInputRef.current) chatInputRef.current.value = "";
    socket.emit("chat:stopTyping", { userId: currentUser.id });
  }, [newMessage, currentUser]);

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);

    if (!currentUser) return;

    socket.emit("chat:startTyping", {
      roomId: currentUser.roomId ?? "",
      x: currentUser.x,
      y: currentUser.y,
      userId: currentUser.id,
      username: currentUser.username,
    });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("chat:stopTyping", { userId: currentUser.id });
    }, 2000);
  };

  // -----  Listeners ---- 
  useEffect(() => {
    if (!socket) return;

    const handleMessage = (msg: ChatMessage) => {
      if (msg.userId === currentUser?.id) return;
      setMessages((prev) => [...prev, msg]);
    };

    const handleTypingUser = (user: TypingUser) => {
      setTypingUsers((prev) => {
        const copy = new Map(prev);
        copy.set(user.userId, user);
        return copy;
      });
    };

    const handleStopTyping = (data: { userId: string }) => {
      setTypingUsers((prev) => {
        const copy = new Map(prev);
        copy.delete(data.userId);
        return copy;
      });
    };

    socket.on("chat:message", handleMessage);
    socket.on("chat:startTyping", handleTypingUser);
    socket.on("chat:stopTyping", handleStopTyping);

    return () => {
      socket.off("chat:message", handleMessage);
      socket.off("chat:startTyping", handleTypingUser);
      socket.off("chat:stopTyping", handleStopTyping);
    };
  }, [socket]);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!showChat && (
        <button
          className="w-12 h-12 flex items-center justify-center rounded-full bg-gray-800 text-cyan-400 border-2 border-cyan-400 shadow-lg hover:scale-110 transition-transform"
          onClick={() => setShowChat(true)}
        >
          💬
        </button>
      )}

      {/* Chat box */}
      <AnimatePresence>
        {showChat && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="w-80 h-96 flex flex-col bg-gray-900 border-2 border-cyan-400 rounded-lg shadow-xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex justify-between items-center px-3 py-2 bg-gray-800 border-b border-cyan-400">
              <h3 className="text-cyan-400 text-sm font-bold">Global Chat</h3>
              <button
                className="text-cyan-400 hover:text-red-400 transition-colors"
                onClick={() => setShowChat(false)}
              >
                ✕
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-2 text-xs space-y-2">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`p-2 rounded-md max-w-[80%] ${
                    message.userId === currentUser?.id
                      ? "bg-cyan-500 text-black ml-auto"
                      : "bg-gray-700 text-gray-100"
                  }`}
                >
                  <span className="block font-bold">{message.username}</span>
                  <span>{message.message}</span>
                </div>
              ))}

              {/* Typing indicators */}
              {Array.from(typingUsers.values()).map((user) => (
                <div key={user.userId} className="text-gray-400 text-xs italic">
                  {user.username} is typing...
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="flex border-t border-cyan-400">
              <input
                ref={chatInputRef}
                type="text"
                placeholder="Type..."
                value={newMessage}
                onChange={handleTyping}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                className="flex-1 px-2 py-2 bg-gray-800 text-gray-100 text-sm focus:outline-none"
              />
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim()}
                className="px-3 py-2 bg-cyan-500 text-black font-bold hover:bg-cyan-400 disabled:opacity-50 transition-colors"
              >
                Send
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatPanel;

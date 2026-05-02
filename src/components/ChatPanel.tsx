import type { RootState } from "@/Redux";
import { useSocket } from "@/SocketProvider";
import type { ChatMessage, TypingUser } from "@/types/chatTypes";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSelector } from "react-redux";
import { motion, AnimatePresence } from "motion/react";
import { MessageCircle, X, Send } from "lucide-react";

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
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end">
      {/* Chat box */}
      <AnimatePresence>
        {showChat && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95, transformOrigin: "bottom right" }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="w-[calc(100vw-2rem)] sm:w-80 h-[28rem] mb-4 flex flex-col bg-white/90 backdrop-blur-xl border border-white/50 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-hidden"
          >
            {/* Header */}
            <div className="flex justify-between items-center px-4 py-3 bg-white/50 border-b border-slate-200/60 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <h3 className="text-slate-800 text-[15px] font-semibold">Global Chat</h3>
              </div>
              <button
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-200/50 hover:text-slate-800 transition-colors"
                onClick={() => setShowChat(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 custom-scrollbar flex flex-col">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-2">
                  <MessageCircle className="w-10 h-10 opacity-20" />
                  <p className="text-sm">Say hi to everyone!</p>
                </div>
              )}
              {messages.map((message) => {
                const isMe = message.userId === currentUser?.id;
                return (
                  <div
                    key={message.id}
                    className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                  >
                    {!isMe && (
                      <span className="text-[11px] font-semibold text-slate-500 ml-1 mb-1">
                        {message.username}
                      </span>
                    )}
                    <div
                      className={`px-3.5 py-2 rounded-2xl max-w-[85%] break-words text-[14px] leading-snug shadow-sm ${
                        isMe
                          ? "bg-blue-600 text-white rounded-br-sm"
                          : "bg-white border border-slate-100 text-slate-800 rounded-bl-sm"
                      }`}
                    >
                      {message.message}
                    </div>
                  </div>
                );
              })}

              {/* Typing indicators */}
              {Array.from(typingUsers.values()).map((user) => (
                <div key={user.userId} className="text-slate-400 text-xs italic flex items-center gap-1.5 ml-1">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                  <span className="ml-1">{user.username} is typing</span>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="p-3 bg-white/50 border-t border-slate-200/60 backdrop-blur-md">
              <div className="flex items-center gap-2 bg-white rounded-full border border-slate-200 shadow-sm pl-4 pr-1.5 py-1.5 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
                <input
                  ref={chatInputRef}
                  type="text"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={handleTyping}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  className="flex-1 bg-transparent text-slate-800 text-sm focus:outline-none placeholder:text-slate-400"
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-blue-600 text-white disabled:bg-slate-100 disabled:text-slate-400 transition-colors shrink-0 hover:bg-blue-700 active:scale-95"
                >
                  <Send className="w-4 h-4 ml-0.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!showChat && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-14 h-14 flex items-center justify-center rounded-full bg-blue-600 text-white shadow-[0_8px_30px_rgb(59,130,246,0.4)] transition-shadow hover:shadow-[0_8px_30px_rgb(59,130,246,0.6)] z-50 mt-auto"
            onClick={() => setShowChat(true)}
          >
            <MessageCircle className="w-6 h-6" />
            <span className="absolute top-0 right-0 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500 border-2 border-white"></span>
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatPanel;

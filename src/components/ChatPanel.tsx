// import React from "react";

// const ChatPanel = () => {
//   return (
//     <div className="chat-panel">
//       <div className="chat-header">
//         <h3>Nearby Chat</h3>
//         <button onClick={() => setShowChat(false)}>✕</button>
//       </div>

//       <div className="chat-messages">
//         {messages.map((message) => (
//           <div
//             key={message.id}
//             className={`chat-message ${
//               message.userId === currentUser?.id ? "own" : ""
//             }`}
//           >
//             <span className="message-username">{message.username}</span>
//             <span className="message-text">{message.message}</span>
//             <span className="message-distance">
//               {message.distance ? `${Math.round(message.distance)}px away` : ""}
//             </span>
//           </div>
//         ))}

//         {/* Typing indicators */}
//         {Array.from(typingUsers.values()).map((typingUser) => (
//           <div key={typingUser.userId} className="typing-indicator">
//             {typingUser.username} is typing...
//           </div>
//         ))}
//       </div>

//       <div className="chat-input">
//         <input
//           ref={chatInputRef}
//           type="text"
//           placeholder="Type a message..."
//           value={newMessage}
//           onChange={handleTyping}
//           onKeyPress={(e) => e.key === "Enter" && sendMessage()}
//         />
//         <button onClick={sendMessage} disabled={!newMessage.trim()}>
//           Send
//         </button>
//       </div>
//     </div>
//   );
// };

// export default ChatPanel;

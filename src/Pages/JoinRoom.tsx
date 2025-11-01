import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../App.css";
import { setCurrentUser, updateUsersInRoom } from "../Redux/roomState";
import { useDispatch } from "react-redux";
import { useSocket } from "../SocketProvider";
import type { JoinRoomResponse } from "@/types/types";
import { ThemeCarousel } from "@/components/JoinRoom/ThemeCarousel";
import { ArrowRight, AlertCircle } from "lucide-react";
import type { RoomThemes } from "@/types/roomTypes";

export const JoinRoom = () => {
  const socket = useSocket();
  const Navigate = useNavigate();
  const [IsJoining, setIsJoining] = useState<boolean>(false);
  const [roomName, setRoomName] = useState<string>("");
  const [roomTheme, setRoomTheme] = useState<null | RoomThemes>(null);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const dispatch = useDispatch();
  const nav = useNavigate();

  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  const handleRoomNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRoomName(e.target.value);
    if (error) clearMessages();
  };

  const joinRoom = async () => {
    clearMessages();

    if (!roomName.trim()) {
      setError("Room name is required");
      return;
    }

    if (!socket) {
      setError("Connection error. Please refresh and try again.");
      return;
    }

    Navigate("/lobby", { state: { roomName, from: "create" } });
  };

  return (
    <div
      className="flex flex-col md:flex-row justify-center items-center w-full h-screen space-y-6 md:space-y-0 md:space-x-6 p-4
    "
      style={{
        minHeight: "100vh",
        width: "100%",
        backgroundImage: `
      radial-gradient(circle at 25% 25%, rgba(255,255,255,0.8) 1px, transparent 2px),
      radial-gradient(circle at 75% 75%, rgba(255,255,255,0.6) 0.5px, transparent 1px),
      radial-gradient(circle at 50% 10%, rgba(255,255,255,1) 1.5px, transparent 2px),
      radial-gradient(circle at 10% 80%, rgba(255,255,255,0.4) 0.8px, transparent 1.5px),
      radial-gradient(circle at 90% 20%, rgba(255,255,255,0.9) 1px, transparent 2px),
      radial-gradient(circle at 30% 60%, rgba(255,255,255,0.5) 0.6px, transparent 1px),
      radial-gradient(circle at 80% 90%, rgba(255,255,255,0.7) 1.2px, transparent 2px),
      radial-gradient(circle at 15% 40%, rgba(255,255,255,0.3) 0.4px, transparent 1px),
      linear-gradient(360deg, hsla(228, 27%, 29%, 1) 19%, hsla(227, 82%, 4%, 1) 100%)
    `,
        backgroundSize:
          "300px 300px, 200px 200px, 400px 400px, 250px 250px, 350px 350px, 180px 180px, 320px 320px, 150px 150px, 100% 100%",
        backgroundPosition:
          "0 0, 100px 50px, 200px 100px, 50px 200px, 150px 0px, 250px 150px, 300px 50px, 0px 100px, 0 0",
        backgroundRepeat: "repeat",
      }}
    >
      {/* Simple message display */}
      {(error || success) && (
        <div className="fixed top-4 right-4 z-50">
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-md shadow-md ${
              error
                ? "bg-red-50 text-red-700 border border-red-200"
                : "bg-green-50 text-green-700 border border-green-200"
            }`}
          >
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error || success}</span>
          </div>
        </div>
      )}

      {/* Theme selection */}
      <div className="w-full max-w-xs relative overflow-hidden md:overflow-visible">
        <h2 className="text-lg font-medium text-center mb-3">
          Select a Room Theme
        </h2>
        <div className="w-full md:mr-5">
          <ThemeCarousel />
        </div>
      </div>

      {/* Room name input */}
      <div className="w-full md:ml-10 max-w-xs flex flex-col space-y-4">
        <div className="flex flex-col">
          <label className="text-sm mb-1 text-white">Enter Space Name</label>
          <input
            type="text"
            placeholder="Room Name"
            value={roomName}
            onChange={handleRoomNameChange}
            disabled={IsJoining}
            className={`w-full px-4 text-white py-2 border rounded-md focus:outline-none focus:ring-2 transition-colors ${
              error
                ? "border-red-300 focus:ring-red-500"
                : "border-gray-300 focus:ring-blue-500"
            } ${IsJoining ? "bg-gray-100 cursor-not-allowed" : ""}`}
          />
          {error && <span className="text-xs text-red-600 mt-1">{error}</span>}
        </div>

        <div className="flex justify-end">
          <button
            className={`px-6 py-2 rounded-2xl transition flex items-center gap-2 ${
              IsJoining || !roomName.trim()
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
            onClick={joinRoom}
            disabled={IsJoining || !roomName.trim()}
          >
            {IsJoining ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Creating...
              </>
            ) : (
              <>
                Create space
                <ArrowRight className="inline size-5 ml-2" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default JoinRoom;

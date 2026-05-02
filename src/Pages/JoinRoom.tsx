import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../App.css";
import { setCurrentUser, updateUsersInRoom } from "../Redux/roomState";
import { useDispatch } from "react-redux";
import { useSocket } from "../SocketProvider";
import type { JoinRoomResponse } from "@/types/types";
import { ThemeCarousel } from "@/components/JoinRoom/ThemeCarousel";
import { ArrowRight, AlertCircle } from "lucide-react";
import type { RoomTheme } from "@/types/roomTypes";
import { RoomSetupStorage } from "@/lib/sessionStorage";

export const JoinRoom = () => {
  const socket = useSocket();
  const Navigate = useNavigate();
  const [IsJoining, setIsJoining] = useState<boolean>(false);
  const [roomName, setRoomName] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

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

    console.log(
      "join",
      RoomSetupStorage.get().roomName,
      RoomSetupStorage.get().roomTheme
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row justify-center items-center w-full p-6 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-96 bg-blue-600 rounded-b-[100px] shadow-lg opacity-10 transform -translate-y-20 pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-cyan-400 rounded-full blur-3xl opacity-20 pointer-events-none" />
      <div className="absolute top-20 -left-20 w-72 h-72 bg-blue-500 rounded-full blur-3xl opacity-10 pointer-events-none" />

      {/* Simple message display */}
      {(error || success) && (
        <div className="fixed top-6 right-6 z-50 animate-in slide-in-from-top-4">
          <div
            className={`flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg font-medium backdrop-blur-sm ${
              error
                ? "bg-rose-50/90 text-rose-700 border border-rose-200"
                : "bg-emerald-50/90 text-emerald-700 border border-emerald-200"
            }`}
          >
            <AlertCircle className="w-5 h-5" />
            <span>{error || success}</span>
          </div>
        </div>
      )}

      {/* Main Card */}
      <div className="relative z-10 bg-white/80 backdrop-blur-xl border border-slate-200/60 shadow-2xl rounded-[32px] p-8 md:p-12 w-full max-w-4xl flex flex-col md:flex-row items-center gap-12">
        
        {/* Left Side: Theme Selection */}
        <div className="w-full md:w-1/2 flex flex-col items-center">
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
              Choose your environment
            </h2>
            <p className="text-slate-500 mt-2">
              Select a theme for your virtual office space.
            </p>
          </div>
          <div className="w-full max-w-sm rounded-2xl overflow-hidden shadow-inner bg-slate-100 p-2 border border-slate-200/50">
            <ThemeCarousel />
          </div>
        </div>

        {/* Divider for desktop */}
        <div className="hidden md:block w-px h-64 bg-slate-200" />

        {/* Right Side: Room Setup */}
        <div className="w-full md:w-1/2 flex flex-col space-y-6">
          <div>
            <h2 className="text-3xl font-bold text-slate-800 tracking-tight mb-2">
              Ready to enter?
            </h2>
            <p className="text-slate-500">
              Give your space a name and jump right in.
            </p>
          </div>

          <div className="flex flex-col space-y-2">
            <label className="text-sm font-semibold text-slate-700 ml-1">
              Space Name
            </label>
            <input
              type="text"
              placeholder="e.g. Morning Standup"
              value={roomName}
              onChange={handleRoomNameChange}
              disabled={IsJoining}
              className={`w-full px-5 py-4 bg-slate-50 border rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all hover:border-slate-300 ${
                error
                  ? "border-rose-300 focus:ring-rose-500/20 focus:border-rose-500"
                  : "border-slate-200 focus:ring-blue-500/20 focus:border-blue-500"
              } ${IsJoining ? "bg-slate-100 cursor-not-allowed opacity-70" : ""}`}
            />
            {error && <span className="text-sm text-rose-500 font-medium ml-1 mt-1">{error}</span>}
          </div>

          <button
            className={`w-full py-4 rounded-xl transition-all font-semibold shadow-md relative overflow-hidden flex items-center justify-center gap-2 ${
              IsJoining || !roomName.trim()
                ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                : "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
            }`}
            onClick={joinRoom}
            disabled={IsJoining || !roomName.trim()}
          >
            {IsJoining ? (
              <>
                <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                <span>Creating Space...</span>
              </>
            ) : (
              <>
                <span>Create Space</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default JoinRoom;

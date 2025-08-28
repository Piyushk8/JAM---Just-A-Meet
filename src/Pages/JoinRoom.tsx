import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../App.css";
import { setCurrentUser, updateUsersInRoom } from "../Redux/roomState";
import { useDispatch } from "react-redux";
import { useSocket } from "../SocketProvider";
import type { JoinRoomResponse } from "@/types/types";
interface User {
  id: string;
  username: string;
  x: number;
  y: number;
  distance?: number;
  isAudioEnabled?: boolean;
  isVideoEnabled?: boolean;
}

export const JoinRoom = () => {
  const socket = useSocket();
  const [username, setUsername] = useState("");
  const [roomName, setRoomName] = useState<string>("");
  const [roomId, setRoomId] = useState<string>("");
  const dispatch = useDispatch();
  const nav = useNavigate();

  useEffect(() => {
    const handleRoomUsers = (roomUsers: User[]) => {
      console.log("roomUsers", roomUsers);
      dispatch(updateUsersInRoom(roomUsers));
    };

    // Add event listeners
    socket.on("room-users", handleRoomUsers);

    return () => {
      socket.off("room-users", handleRoomUsers);
    };
  }, [socket, dispatch]);

  const joinRoom = async () => {
    if (socket && username.trim()) {
      socket.emit(
        "join-room",
        {
          roomId: roomId.trim() ?? undefined,
          roomName: roomName.trim() ?? undefined,
        },
        async (res: { success: boolean; data: JoinRoomResponse }) => {
          try {
            if (!res || !res.success || !res.data) {
              console.log("Error in joining room");
            } else {
              if (!socket.id) return;
              const { userId, userName, availability, sprite } = res.data.user;
              const { roomId } = res.data.room;
              dispatch(
                setCurrentUser({
                  id: userId,
                  username: userName,
                  x: 22,
                  y: 10,
                  socketId: socket.id,
                  roomId: roomId,
                  isAudioEnabled: false,
                  isVideoEnabled: false,
                  sprite: sprite ?? "alex",
                  availability: availability,
                })
              );
              nav(`/r/${roomId}`);
            }
          } catch (error) {
            console.log("error joinig", error);
          }
        }
      );
    }
  };

  return (
    <>
      <div className="login-container h-screen w-screen flex items-center justify-center p-4">
        <div className="login-form flex flex-col space-y-5 justify-center items-center ring-1 ring-sky-300 rounded-2xl h-1/2 w-1/2">
          <h1 className="text-4xl font-bold text-balance ">
            Join Virtual Office
          </h1>
          <div className="flex flex-col items-center justify-center gap-8">
            <input
              type="text"
              placeholder="Enter your name"
              value={username}
              className="h-8 w-full rounded-2xl bg-gray-200 p-5 text-gray-800"
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && joinRoom()}
            />
            <input
              type="text"
              placeholder="Room ID"
              value={roomId}
              className="bg-gray-200 h-8 w-full border-2 text-gray-900  border-sky-200 flex items-center justify-center p-5 rounded-2xl"
              onChange={(e) => setRoomId(e.target.value)}
            />
            <input
              type="text"
              placeholder="Room Name"
              value={roomName}
              className="bg-gray-200 h-8 w-full border-2 text-gray-900  border-sky-200 flex items-center justify-center p-5 rounded-2xl"
              onChange={(e) => setRoomName(e.target.value)}
            />
            <button
              className="bg-sky-300 px-4 py-2 hover:bg-white border-sky-300 rounded-2xl border-1 font-semibold hover:text-sky-300 text-white"
              onClick={joinRoom}
              disabled={!username.trim()}
            >
              Join Room
            </button>
          </div>
          <p className="privacy-notice text-red-300 text-balance font-semibold text-sm text-left">
            📱 Audio & Video access will be requested for voice chat
          </p>
        </div>
      </div>
    </>
  );
};

export default JoinRoom;

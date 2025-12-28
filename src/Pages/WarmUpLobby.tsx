import VideoSelection from "@/components/JoinRoom/VideoSelection";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import VideoPreview from "@/components/WarmupLobby/videoPreview";
import { DropdownMenuCheckboxItem } from "@radix-ui/react-dropdown-menu";
import {
  ArrowRight,
  ChevronDownIcon,
  ChevronUp,
  Mic,
  MicOff,
  VideoIcon,
  VideoOff,
} from "lucide-react";
import React, { useRef, useState, useEffect } from "react";
import { motion } from "motion/react";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "@/Redux";
import {
  setCurrentUser,
  setRoomTheme,
  updateCurrentUser,
} from "@/Redux/roomState";
import {
  Sprites,
  type JoinRoomResponse,
  type SpriteNames,
} from "@/types/types";
import { useLocation, useNavigate } from "react-router-dom";
import { useSocket } from "@/SocketProvider";
import { RoomThemesConfig } from "@/components/JoinRoom/ThemeCarousel";
import type { RoomTheme } from "@/types/roomTypes";
import { RoomSetupStorage } from "@/lib/sessionStorage";

const WarmUpLobby = () => {
  const location = useLocation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const socket = useSocket();
  const [IsJoining, setIsJoining] = useState(false);

  const [videoOn, setVideoOn] = useState(false);
  const [audioOn, setAudioOn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [selectedAudio, setSelectedAudio] = useState<string | null>(null);
  const [showVideoDropdown, setShowVideoDropdown] = useState(false);
  const [showAudioDropdown, setShowAudioDropdown] = useState(false);
  const nav = useNavigate();
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  const [hasVideoPermission, setHasVideoPermission] = useState(false);
  const [hasAudioPermission, setHasAudioPermission] = useState(false);
  const [isRequestingPermissions, setIsRequestingPermissions] = useState(false);
  const dispatch = useDispatch();
  const { currentUser } = useSelector((state: RootState) => state.roomState);

  const [SelectedCharacter, setSelectedCharacter] =
    useState<SpriteNames>("Adam");
  const [canEnterRoom, setCanEnterRoom] = useState(
    hasVideoPermission && hasAudioPermission && SelectedCharacter
  );
  // Check if both permissions are granted

  useEffect(() => {
    setCanEnterRoom(
      hasVideoPermission && hasAudioPermission && SelectedCharacter
    );
  }, [hasVideoPermission, hasAudioPermission, SelectedCharacter]);

  useEffect(() => {
    const getDevices = async () => {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videos = devices.filter((d) => d.kind === "videoinput");
      const audios = devices.filter((d) => d.kind === "audioinput");

      setVideoDevices(videos);
      setAudioDevices(audios);

      if (videos.length > 0) setSelectedVideo(videos[0].deviceId);
      if (audios.length > 0) setSelectedAudio(audios[0].deviceId);
    };

    getDevices();
  }, []);

  const requestPermissions = async () => {
    setIsRequestingPermissions(true);
    setError(null);

    try {
      // Request both video and audio permissions
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      setMediaStream(stream);
      setHasVideoPermission(stream.getVideoTracks().length > 0);
      setHasAudioPermission(stream.getAudioTracks().length > 0);
      setVideoOn(stream.getVideoTracks().length > 0);
      setAudioOn(stream.getAudioTracks().length > 0);
    } catch (err) {
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        setMediaStream(videoStream);
        setHasVideoPermission(true);
        setHasAudioPermission(false);
        setVideoOn(true);
        setAudioOn(false);
        setError(
          "Microphone permission denied. Both camera and microphone are required to enter the room."
        );
      } catch (videoErr) {
        setHasVideoPermission(false);
        setHasAudioPermission(false);
        setError(
          "Camera and microphone permissions are required to enter the room."
        );
      }
    } finally {
      setIsRequestingPermissions(false);
    }
  };

  const switchDevice = async (
    deviceId: string,
    deviceType: "video" | "audio"
  ) => {
    if (!mediaStream) return;

    try {
      if (deviceType === "audio") {
        // Only replace audio track
        const audioTracks = mediaStream.getAudioTracks();
        audioTracks.forEach((track) => track.stop());

        const newAudioStream = await navigator.mediaDevices.getUserMedia({
          audio: { deviceId: { exact: deviceId } },
        });

        const newAudioTrack = newAudioStream.getAudioTracks()[0];

        // Remove old audio tracks and add new one
        audioTracks.forEach((track) => mediaStream.removeTrack(track));
        if (newAudioTrack) mediaStream.addTrack(newAudioTrack);

        setAudioOn(true);
      } else {
        const videoTracks = mediaStream.getVideoTracks();
        videoTracks.forEach((track) => track.stop());

        const newVideoStream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: deviceId } },
        });

        const newVideoTrack = newVideoStream.getVideoTracks()[0];

        videoTracks.forEach((track) => mediaStream.removeTrack(track));
        if (newVideoTrack) mediaStream.addTrack(newVideoTrack);

        setVideoOn(true);
      }

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Failed to switch device:", err);
      setError(`Failed to switch ${deviceType}. Please try again.`);
    }
  };

  const handleVideoChange = async (deviceId: string) => {
    setSelectedVideo(deviceId);
    await switchDevice(deviceId, "video");
  };

  const handleAudioChange = async (deviceId: string) => {
    setSelectedAudio(deviceId);
    await switchDevice(deviceId, "audio");
  };

  const toggleVideo = () => {
    const videoTrack = mediaStream?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setVideoOn(videoTrack.enabled);
    }
  };

  const toggleAudio = () => {
    const audioTrack = mediaStream?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setAudioOn(audioTrack.enabled);
    }
  };

  const handleEnterRoom = () => {
    if (!canEnterRoom || !socket) return;

    const fromJoinOrCreate = location.state?.from;
    const roomId = location.state?.roomId;
    const roomName = location.state?.roomName;
    const { roomTheme } = RoomSetupStorage.get();
    console.log("lobby",RoomSetupStorage.get().roomName,RoomSetupStorage.get().roomTheme)
    let payload: {
      roomId?: string;
      roomName?: string;
      sprite: SpriteNames;
      roomTheme?: RoomTheme;
    } = {
      sprite: SelectedCharacter,
    };

    if (fromJoinOrCreate === "join" && roomId) {
      const roomIdAndThemeId = roomId.split("&");
      const RoomId = roomIdAndThemeId[0];

      payload.roomId = RoomId.trim();
    } else if (fromJoinOrCreate === "create" && roomName) {
      payload.roomName = roomName.trim();

      if (!roomTheme) throw new Error("no room theme found for creation");

      payload.roomTheme = roomTheme;
    } else {
      setError("Invalid room information.");
      return;
    }

    setIsJoining(true);

    socket.emit(
      "join-room",
      payload,
      (res: { success: boolean; data: JoinRoomResponse }) => {
        try {
          if (!res || !res.success || !res.data) {
            setError("Failed to join room. Please try again.");
            return;
          }

          if (!socket.id) {
            setError("Socket connection lost. Please refresh and try again.");
            return;
          }

          const { userId, userName, availability, sprite } = res.data.user;
          const { roomId, roomTheme } = res.data.room;

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
              sprite: SelectedCharacter,
              availability: availability,
            })
          );
          dispatch(
            setRoomTheme(RoomThemesConfig[res.data.room.roomTheme].db_name)
          );
          nav(`/r/${roomId}`);
        } catch (error) {
          setError("An unexpected error occurred. Please try again.");
        } finally {
          setIsJoining(false);
          RoomSetupStorage.clear();
        }
      }
    );
  };

  useEffect(() => {
    return () => {
      mediaStream?.getTracks().forEach((track) => track.stop());
    };
  }, [mediaStream]);

  useEffect(() => {
    if (videoRef.current && mediaStream) {
      videoRef.current.srcObject = mediaStream;
      videoRef.current.play().catch(console.error);
    }
  }, [mediaStream]);

  return (
    <div
      className="flex flex-col items-center justify-center w-screen h-screen p-4"
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
      <h2 className="text-white text-4xl font-semibold mb-8 text-center">
        Welcome !
      </h2>

      {/* Video & Avatar Section */}
      <div className="flex flex-col md:flex-row justify-center items-center gap-10 w-full">
        {/* Video Preview & Controls */}
        <div className="flex flex-col items-center space-y-4">
          <VideoPreview videoRef={videoRef} />
          {!mediaStream ? (
            <button
              onClick={requestPermissions}
              disabled={isRequestingPermissions}
              className="px-6 py-2 bg-blue-700 text-white rounded-xl hover:bg-blue-600 transition disabled:bg-gray-500 disabled:cursor-not-allowed"
            >
              {isRequestingPermissions
                ? "Requesting..."
                : "Allow Camera & Microphone"}
            </button>
          ) : (
            <div className="flex flex-row gap-4">
              {/* Video Button */}
              <VideoSelection
                setShowVideoDropdown={setShowVideoDropdown}
                showVideoDropdown={showVideoDropdown}
                videoDevices={videoDevices}
                videoOn={videoOn}
                handleVideoChange={handleVideoChange}
                toggleVideo={toggleVideo}
                selectedVideo={selectedVideo}
                setSelectedVideo={setSelectedVideo}
              />
              {/* Audio Button */}
              <div
                className={`px-4 py-2 flex items-center gap-2 rounded-2xl transition ${
                  audioOn
                    ? "bg-green-500 text-white"
                    : "bg-red-500 text-red-200"
                }`}
              >
                <button className="" onClick={toggleAudio}>
                  {audioOn ? <Mic size={18} /> : <MicOff size={18} />}
                </button>
                <p className="opacity-50">|</p>
                <DropdownMenu
                  open={showAudioDropdown}
                  onOpenChange={setShowAudioDropdown}
                >
                  <DropdownMenuTrigger asChild>
                    <span>
                      {showAudioDropdown ? (
                        <ChevronUp size={18} />
                      ) : (
                        <ChevronDownIcon size={18} />
                      )}
                    </span>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent className="w-48 text-sm text-gray-800 rounded-md shadow-lg z-50">
                    <DropdownMenuLabel>Audio Devices</DropdownMenuLabel>
                    {audioDevices.map((device) => (
                      <DropdownMenuCheckboxItem
                        key={device.deviceId}
                        className="cursor-pointer"
                        checked={selectedAudio === device.deviceId}
                        onCheckedChange={() =>
                          setSelectedAudio(device.deviceId)
                        }
                        onClick={() => handleAudioChange(device.deviceId)}
                      >
                        {device.label || `Microphone ${device.deviceId}`}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          )}

          {/* Error Message */}
          <p className="text-red-400 mt-2 text-sm min-h-[1.25rem] text-center max-w-sm">
            {error || "\u00A0"}
          </p>
        </div>

        {/* Avatar Selection */}
        <div className="flex flex-col items-center space-y-4">
          <h2 className="text-white text-lg font-semibold">
            Select Your Avatar
          </h2>
          <div className="flex flex-wrap gap-4 justify-center">
            {Sprites.map((a) => (
              <motion.div
                key={a}
                className="w-16 h-16 backdrop-blur-3xl bg-transparent ring-white rounded-full flex justify-center items-center cursor-pointer hover:ring-1 hover:ring-gray-400 transition"
                whileHover={{
                  scale: 1.3,
                  transition: { duration: 0.15, ease: "easeOut" },
                }}
                animate={{
                  scale: SelectedCharacter === a ? 1.5 : 1,
                  transition: { duration: 0.15, ease: "easeOut" },
                }}
                onClick={() => setSelectedCharacter(a)}
              >
                <img src={`/assets/character/single/${a}_idle_anim_22.png`} />
              </motion.div>
            ))}
          </div>

          <button
            onClick={handleEnterRoom}
            disabled={!canEnterRoom}
            className={`flex px-4 py-2 hover:scale-x-95 hover:scale-y-95 rounded-2xl 
              justify-center gap-2 items-center text-sm transition-all ${
                canEnterRoom
                  ? "bg-blue-700 text-white hover:bg-blue-600"
                  : "bg-gray-500 text-gray-300 cursor-not-allowed"
              }`}
            title={
              !canEnterRoom
                ? "Please allow camera and microphone access, and select an avatar"
                : ""
            }
          >
            {!canEnterRoom && (!hasVideoPermission || !hasAudioPermission)
              ? "Permissions Required"
              : !currentUser?.sprite
              ? "Select Avatar"
              : "Proceed to room"}
            <ArrowRight className="size-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default WarmUpLobby;

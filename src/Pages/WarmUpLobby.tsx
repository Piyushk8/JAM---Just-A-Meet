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
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center w-full p-6 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-96 bg-blue-600 rounded-b-[100px] shadow-lg opacity-10 transform -translate-y-20 pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-cyan-400 rounded-full blur-3xl opacity-20 pointer-events-none" />
      <div className="absolute top-20 -left-20 w-72 h-72 bg-blue-500 rounded-full blur-3xl opacity-10 pointer-events-none" />

      {/* Main Card */}
      <div className="relative z-10 bg-white/80 backdrop-blur-xl border border-slate-200/60 shadow-2xl rounded-[32px] p-8 md:p-12 w-full max-w-5xl flex flex-col gap-8 items-center">

        <div className="text-center mb-2">
          <h2 className="text-slate-800 text-3xl font-bold tracking-tight">
            Check your surroundings
          </h2>
          <p className="text-slate-500 mt-2 font-medium">
            Make sure your camera and microphone are working before you enter.
          </p>
        </div>

        {/* Video & Avatar Section */}
        <div className="flex flex-col lg:flex-row justify-center items-center lg:items-stretch gap-12 w-full">

          {/* Video Preview & Controls */}
          <div className="flex flex-col items-center space-y-5 w-full max-w-sm">
            <div className="w-full aspect-video bg-slate-900 rounded-2xl overflow-hidden shadow-inner border-4 border-slate-100/50 relative flex items-center justify-center">
              <VideoPreview videoRef={videoRef} />
            </div>

            {!mediaStream ? (
              <button
                onClick={requestPermissions}
                disabled={isRequestingPermissions}
                className="w-full py-3.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all shadow-md active:scale-95 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed disabled:active:scale-100"
              >
                {isRequestingPermissions
                  ? "Requesting..."
                  : "Allow Camera & Mic"}
              </button>
            ) : (
              <div className="flex flex-row gap-4 w-full justify-center">
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
                  className={`px-4 py-2.5 flex items-center gap-2 rounded-2xl transition-all shadow-sm ${audioOn
                      ? "bg-slate-800 text-white hover:bg-slate-700"
                      : "bg-rose-100 text-rose-600 hover:bg-rose-200"
                    }`}
                >
                  <button onClick={toggleAudio} className="p-1">
                    {audioOn ? <Mic size={20} /> : <MicOff size={20} />}
                  </button>
                  <div className="w-px h-5 bg-current opacity-20" />
                  <DropdownMenu
                    open={showAudioDropdown}
                    onOpenChange={setShowAudioDropdown}
                  >
                    <DropdownMenuTrigger asChild>
                      <button className="p-1 hover:bg-black/10 rounded-full transition-colors">
                        {showAudioDropdown ? (
                          <ChevronUp size={18} />
                        ) : (
                          <ChevronDownIcon size={18} />
                        )}
                      </button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent className="w-48 text-sm text-slate-800 rounded-xl shadow-lg z-50 p-1 border-slate-100">
                      <DropdownMenuLabel className="font-semibold text-xs uppercase text-slate-500 px-2 py-1.5">Audio Devices</DropdownMenuLabel>
                      {audioDevices.map((device) => (
                        <DropdownMenuCheckboxItem
                          key={device.deviceId}
                          className="cursor-pointer rounded-lg focus:bg-slate-100 py-2 px-2.5"
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
            <div className="min-h-[1.5rem] w-full text-center">
              {error && (
                <p className="text-rose-500 text-sm font-medium animate-in slide-in-from-top-1 bg-rose-50 py-1.5 px-3 rounded-lg border border-rose-100">
                  {error}
                </p>
              )}
            </div>
          </div>

          {/* Divider for desktop */}
          <div className="hidden lg:block w-px h-auto bg-slate-200" />

          {/* Avatar Selection */}
          <div className="flex flex-col items-center justify-center space-y-8 w-full max-w-sm">
            <div className="text-center">
              <h3 className="text-slate-800 text-lg font-bold">
                Select Your Avatar
              </h3>
              <p className="text-slate-500 text-sm mt-1">This is how others will see you</p>
            </div>

            <div className="flex flex-wrap gap-4 justify-center bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-inner">
              {Sprites.map((a) => (
                <motion.div
                  key={a}
                  className={`w-14 h-14 rounded-full flex justify-center items-center cursor-pointer transition-colors ${SelectedCharacter === a ? 'bg-blue-100 shadow-md ring-2 ring-blue-500 ring-offset-2' : 'bg-white shadow-sm hover:bg-slate-100 border border-slate-200'}`}
                  whileHover={{
                    scale: 1.15,
                    transition: { duration: 0.15, ease: "easeOut" },
                  }}
                  animate={{
                    scale: SelectedCharacter === a ? 1.25 : 1,
                    transition: { duration: 0.15, ease: "easeOut" },
                  }}
                  onClick={() => setSelectedCharacter(a)}
                >
                  <img src={`/assets/character/single/${a}_idle_anim_22.png`} className="w-10 h-10 object-contain" style={{ imageRendering: "pixelated" }} />
                </motion.div>
              ))}
            </div>

            <button
              onClick={handleEnterRoom}
              disabled={!canEnterRoom}
              className={`w-full py-4 rounded-xl font-semibold shadow-md relative overflow-hidden flex items-center justify-center gap-2 transition-all ${canEnterRoom
                  ? "bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-xl active:scale-95"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                }`}
            >
              {IsJoining ? (
                <>
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>Joining...</span>
                </>
              ) : (
                <>
                  <span>
                    {!canEnterRoom && (!hasVideoPermission || !hasAudioPermission)
                      ? "Permissions Required"
                      : !SelectedCharacter
                        ? "Select Avatar"
                        : "Join Office"}
                  </span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WarmUpLobby;

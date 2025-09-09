import type { User } from "@/types/types";
import React, { useRef, useEffect, useState } from "react";

interface ParticipantMediaProps {
  user: User;
  videoTrack?: any;
  audioTrack?: any;
  isCurrentUser?: boolean;
  isLocal?: boolean;
}

const ParticipantMedia: React.FC<ParticipantMediaProps> = ({
  user,
  videoTrack,
  audioTrack,
  isCurrentUser = false,
  isLocal = false,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);
  useEffect(() => {
    if (videoTrack && videoRef.current) {
      try {
        videoTrack.attach(videoRef.current);
        setIsVideoReady(true);
      } catch (err) {
        console.error(`Failed to attach video for ${user.username}:`, err);
      }

      return () => {
        try {
          if (videoRef.current) {
            videoTrack.detach(videoRef.current);
          }
        } catch (err) {
          console.warn(
            `Video detach skipped (node already removed) for ${user.username}:`,
            err
          );
        }
        setIsVideoReady(false);
      };
    }
  }, [videoTrack, user.username]);

  // Attach audio track (only for remote users)
  useEffect(() => {
    if (audioTrack && audioRef.current && !isLocal) {
      try {
        audioTrack.attach(audioRef.current);
      } catch (err) {
        console.error(`Attach audio failed for ${user.username}:`, err);
      }

      return () => {
        try {
          if (audioRef.current) {
            audioTrack.detach(audioRef.current);
          }
        } catch (err) {
          console.warn(
            `Audio detach skipped (node already removed) for ${user.username}:`,
            err
          );
        }
      };
    }
  }, [audioTrack, user.username, isLocal]);

  const getStatusColor = () => {
    switch (user.availability) {
      case "idle":
        return "bg-green-400";
      case "away":
        return "bg-yellow-400";
      default:
        return "bg-red-400";
    }
  };

  return (
    <div className="flex flex-col items-center space-y-2 p-2">
      {/* Video container */}
      <div
        className={`relative ${
          isCurrentUser ? "ring-2 ring-blue-400" : ""
        } rounded-lg overflow-hidden`}
      >
        <div
          className="relative bg-gray-800 rounded-lg overflow-hidden"
          style={{ width: "120px", height: "90px" }}
        >
          {videoTrack ? (
            <video
              ref={videoRef}
              autoPlay
              muted={isLocal} // mute local to avoid feedback
              playsInline
              className="w-full h-full object-cover"
              style={{ display: isVideoReady ? "block" : "none" }}
            />
          ) : (
            <div className="absolute inset-0 p-4 backdrop-blur-2xl flex items-center justify-center bg-gray-700 text-white text-2xl font-bold">
              {user.username?.[0] || "U"}
            </div>
          )}

          {/* Video loading state */}
          {videoTrack && !isVideoReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-700 text-white text-xs">
              {/* Loading... */}
            </div>
          )}

          {/* Audio status indicator */}
          <div className="absolute top-2 right-2">
            <div
              className={`w-3 h-3 rounded-full ${
                isLocal
                  ? audioTrack
                    ? "bg-green-800"
                    : "bg-red-800"
                  : user.isAudioEnabled
                  ? ""
                  : ""
              }`}
            />
          </div>

          {/* Current user indicator */}
          {isCurrentUser && (
            <div className="absolute bottom-2 left-2 text-xs text-white bg-blue-500 px-1 rounded">
              You
            </div>
          )}
        </div>
      </div>

      {/* User info */}
      <div className="flex items-center space-x-2 backdrop-blur-md px-2 rounded-4xl">
        <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
        <span className="text-sm text-white font-medium truncate max-w-[100px] text-shadow-black text-shadow-2xs">
          {user.username}
        </span>
      </div>

      {/* Hidden audio element for remote users */}
      {audioTrack && !isLocal && (
        <audio ref={audioRef} autoPlay style={{ display: "none" }} />
      )}
    </div>
  );
};

export default ParticipantMedia;

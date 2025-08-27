import React, { useEffect, useRef } from "react";
import { useUserLocalMedia } from "@/Providers/LocalMedia/Context";
import { useSelector } from "react-redux";
import type { RootState } from "@/Redux";

export const LocalPreview: React.FC = () => {
  const { videoTrack, audioTrack } = useUserLocalMedia();
  const { currentUser } = useSelector((state: RootState) => state.roomState);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!videoRef.current) return;

    if (videoTrack) {
      videoTrack.attach(videoRef.current);
      return () => {
        videoTrack.detach(videoRef.current!);
      };
    }
  }, [videoTrack]);

  useEffect(() => {
    if (!audioRef.current) return;

    if (audioTrack) {
      audioTrack.attach(audioRef.current);
      return () => {
        audioTrack.detach(audioRef.current!);
      };
    }
  }, [audioTrack]);

  return (
    <div className="bg-gray-900 rounded-lg overflow-hidden relative aspect video">
      {videoTrack ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-800 text-white text-xl font-bold">
          {currentUser?.username?.[0] || "U"}
        </div>
      )}

      {audioTrack && (
        <audio
          ref={audioRef}
          autoPlay
          playsInline
          muted
          className="hidden"
        />
      )}
    </div>
  );
};

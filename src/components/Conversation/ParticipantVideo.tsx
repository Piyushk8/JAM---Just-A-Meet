import type { RootState } from "@/Redux";
import type { RemoteTrack, RemoteTrackPublication } from "livekit-client";
import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";

export function ParticipantVideo({
  publications,
  isLocal,
  username,
}: {
  publications: {
    videoTracks: RemoteTrack[];
    audioTracks: RemoteTrack[];
    remotePublication: RemoteTrackPublication;
  };
  isLocal?: boolean;
  username: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  
  useEffect(() => {
    const videoTrack = publications.videoTracks[0];
    if (videoTrack && videoRef.current) {
      videoTrack.attach(videoRef.current);
      return () => {
        if (!videoRef.current) return;
        videoTrack.detach(videoRef?.current);
      };
    }
  }, [publications.videoTracks]);

  useEffect(() => {
    const audioTrack = publications.audioTracks[0];
    if (audioTrack && audioRef.current) {
      audioTrack.attach(audioRef.current);
      return () => {
        if(!audioRef.current) return
        audioTrack.detach(audioRef.current);
      };
    }
  }, [publications.audioTracks]);

  const isVideoEnabled = !publications.remotePublication.isMuted;
  const isAudioEnabled = !publications.remotePublication.isMuted;

  return (
    <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
      {publications.videoTracks.length > 0 && isVideoEnabled ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="flex items-center justify-center w-full h-full bg-gray-700">
          <span className="text-white text-lg font-bold">
            {username[0]?.toUpperCase()}
          </span>
        </div>
      )}

      {publications.audioTracks.length > 0 && !isLocal && (
        <audio ref={audioRef} autoPlay playsInline className="hidden" />
      )}

      {/* Overlay UI */}
      <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm flex items-center gap-1">
        <span>{isLocal ? "You" : username}</span>
        {!isAudioEnabled && <span>🔇</span>}
      </div>
    </div>
  );
}

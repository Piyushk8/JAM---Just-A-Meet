import type { RemoteTrack, RemoteTrackPublication } from "livekit-client";
import { useEffect, useRef } from "react";

export function ParticipantVideo({
  publications,
  isLocal,
  username,
}: {
  publications?: {
    videoTracks: RemoteTrack[];
    audioTracks: RemoteTrack[];
    videoPublication: RemoteTrackPublication | null;
    audioPublication: RemoteTrackPublication | null;
  };
  isLocal?: boolean;
  username: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const videoTrack = publications?.videoTracks[0];
    if (videoTrack && videoRef.current) {
      videoTrack.attach(videoRef.current);
      return () => {
        if (!videoRef.current) return;
        videoTrack.detach(videoRef.current);
      };
    }
  }, [publications]);

  useEffect(() => {
    const audioTrack = publications?.audioTracks[0];
    if (audioTrack && audioRef.current && !isLocal) {
      audioTrack.attach(audioRef.current);
      return () => {
        if (!audioRef.current) return;
        audioTrack.detach(audioRef.current);
      };
    }
  }, [publications, isLocal]);

  const isVideoEnabled =
    !!publications?.videoTracks.length && !publications.videoPublication?.isMuted;
  const isAudioEnabled =
    !!publications?.audioTracks.length && !publications.audioPublication?.isMuted;

  return (
    <div className="relative min-h-0 overflow-hidden rounded-lg bg-gray-900 aspect-video">
      {isVideoEnabled ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gray-700">
          <span className="text-lg font-bold text-white">
            {username[0]?.toUpperCase()}
          </span>
        </div>
      )}

      {!isLocal && publications?.audioTracks.length ? (
        <audio ref={audioRef} autoPlay playsInline className="hidden" />
      ) : null}

      <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded bg-black/50 px-2 py-1 text-sm text-white">
        <span>{isLocal ? "You" : username}</span>
        {!isAudioEnabled && <span>Muted</span>}
      </div>
    </div>
  );
}

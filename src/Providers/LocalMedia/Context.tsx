import { liveKitManager } from "@/LiveKit/liveKitManager";
import {
  LocalAudioTrack,
  LocalVideoTrack,
  createLocalAudioTrack,
  createLocalVideoTrack,
} from "livekit-client";
import React, { createContext, useContext, useState } from "react";

type LocalMediaContextType = {
  audioTrack: LocalAudioTrack | null;
  videoTrack: LocalVideoTrack | null;
  enableVideo: () => Promise<void>;
  disableVideo: () => Promise<void>;
  enableAudio: () => Promise<void>;
  disableAudio: () => Promise<void>;
};

const LocalMediaContext = createContext<LocalMediaContextType | null>(null);

export const useUserLocalMedia = () => {
  const ctx = useContext(LocalMediaContext);
  if (!ctx) {
    throw new Error(
      "useUserLocalMedia must be used inside LocalMediaContextProvider"
    );
  }
  return ctx;
};

export const LocalMediaContextProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [audioTrack, setAudioTrack] = useState<LocalAudioTrack | null>(null);
  const [videoTrack, setVideoTrack] = useState<LocalVideoTrack | null>(null);

  const enableVideo = async () => {
    const track = await createLocalVideoTrack({
      resolution: { width: 1280, height: 720 },
      facingMode: "user",
    });
    setVideoTrack(track);

    if (liveKitManager.room) {
      await liveKitManager.room.localParticipant.publishTrack(track);
    }
  };

  /** Disable video */
  const disableVideo = async () => {
    if (videoTrack) {
      if (liveKitManager.room) {
        await liveKitManager.room.localParticipant.unpublishTrack(videoTrack);
      }
      videoTrack.stop();
      setVideoTrack(null);
    }
  };

  const enableAudio = async () => {
    const track = await createLocalAudioTrack();
    setAudioTrack(track);

    if (liveKitManager.room) {
      await liveKitManager.room.localParticipant.publishTrack(track);
    }
  };

  const disableAudio = async () => {
    if (audioTrack) {
      if (liveKitManager.room) {
        await liveKitManager.room.localParticipant.unpublishTrack(audioTrack);
      }
      audioTrack.stop();
      setAudioTrack(null);
    }
  };

  return (
    <LocalMediaContext.Provider
      value={{
        audioTrack,
        videoTrack,
        enableVideo,
        disableVideo,
        enableAudio,
        disableAudio,
      }}
    >
      {children}
    </LocalMediaContext.Provider>
  );
};

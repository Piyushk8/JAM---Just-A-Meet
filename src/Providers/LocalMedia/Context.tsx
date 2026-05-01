import { liveKitManager } from "@/LiveKit/liveKitManager";
import { LocalAudioTrack, LocalVideoTrack } from "livekit-client";
import React, { createContext, useContext, useEffect, useState } from "react";

type LocalMediaContextType = {
  audioTrack: LocalAudioTrack | null;
  videoTrack: LocalVideoTrack | null;
  enableVideo: () => Promise<boolean>;
  disableVideo: () => Promise<boolean>;
  enableAudio: () => Promise<boolean>;
  disableAudio: () => Promise<boolean>;
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
  const [audioTrack, setAudioTrack] = useState<LocalAudioTrack | null>(
    liveKitManager.getLocalAudioTrack()
  );
  const [videoTrack, setVideoTrack] = useState<LocalVideoTrack | null>(
    liveKitManager.getLocalVideoTrack()
  );

  useEffect(() => {
    return liveKitManager.onLocalMediaChanged(({ audioTrack, videoTrack }) => {
      setAudioTrack(audioTrack);
      setVideoTrack(videoTrack);
    });
  }, []);

  const enableVideo = async () => {
    return liveKitManager.toggleVideo(true);
  };

  const disableVideo = async () => {
    return liveKitManager.toggleVideo(false);
  };

  const enableAudio = async () => {
    return liveKitManager.toggleAudio(true);
  };

  const disableAudio = async () => {
    return liveKitManager.toggleAudio(false);
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

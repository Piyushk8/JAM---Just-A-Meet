import { LocalAudioTrack, LocalVideoTrack } from "livekit-client";
import React, { createContext, useContext, useState } from "react";

type LocalMediaContextType = {
  audioTrack: LocalAudioTrack | null;
  videoTrack: LocalVideoTrack | null;
  setAudioTrack: React.Dispatch<React.SetStateAction<LocalAudioTrack | null>>;
  setVideoTrack: React.Dispatch<React.SetStateAction<LocalVideoTrack | null>>;
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

  return (
    <LocalMediaContext.Provider
      value={{
        audioTrack,
        videoTrack,
        setAudioTrack,
        setVideoTrack,
      }}
    >
      {children}
    </LocalMediaContext.Provider>
  );
};

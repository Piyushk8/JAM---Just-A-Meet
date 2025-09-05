import React, { createContext, useContext } from "react";
import type { RemoteTrack, RemoteTrackPublication } from "livekit-client";
import type { liveKitManager } from "../liveKitManager";

export type ParticipantTracks = Map<
  string, // participantId
  {
    remotePublication: RemoteTrackPublication;
    videoTracks: RemoteTrack[];
    audioTracks: RemoteTrack[];
  }
>;

interface LiveKitContextValue {
  manager: typeof liveKitManager | null;
  participantsWithTracks: ParticipantTracks;
  setParticipantsWithTracks: React.Dispatch<
    React.SetStateAction<ParticipantTracks>
  >;
}

export const LiveKitContext = createContext<LiveKitContextValue | undefined>(
  undefined
);

export const useLiveKit = () => {
  const ctx = useContext(LiveKitContext);
  if (!ctx) throw new Error("useLiveKit must be used inside LiveKitProvider");
  return ctx;
};

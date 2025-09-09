import { useEffect, useState } from "react";
import { liveKitManager } from "../liveKitManager";
import { type RemoteTrackPublication, RemoteTrack } from "livekit-client";
import { LiveKitContext, type ParticipantTracks } from "./Context";

export const LiveKitProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [manager] = useState(() => liveKitManager);
  const [participantsWithTracks, setParticipantsWithTracks] =
    useState<ParticipantTracks>(new Map());
  useEffect(() => {
    const handleTrackSubscribed = (
      participantId: string,
      track: RemoteTrack,
      publication: RemoteTrackPublication
    ) => {
      setParticipantsWithTracks((prev) => {
        const newMap = new Map(prev);

        const existing = newMap.get(participantId) || {
          remotePublication: publication,
          audioTracks: [],
          videoTracks: [],
        };
        if (track.kind === "video") {
          existing.videoTracks = [...existing.videoTracks, track];
        } else if (track.kind === "audio") {
          existing.audioTracks = [...existing.audioTracks, track];
        }
        newMap.set(participantId, existing);
        return newMap;
      });
    };

    const handleTrackUnsubscribed = (
      participantId: string,
      track: RemoteTrack,
      publication: RemoteTrackPublication
    ) => {
      setParticipantsWithTracks((prev) => {
        const newMap = new Map(prev);
        const existing = newMap.get(participantId) || {
          remotePublication: publication,
          audioTracks: [],
          videoTracks: [],
        };
        if (track.kind === "video") {
          existing.videoTracks.filter((v) => v != track);
        } else if (track.kind === "audio") {
          existing.audioTracks.filter((a) => a != track);
        }
        newMap.set(participantId, existing);
        return newMap;
      });
    };

    manager.onTrackSubscribed(handleTrackSubscribed);
    manager.onTrackUnsubscribed(handleTrackUnsubscribed);

    return () => {};
  }, [manager]);

  return (
    <LiveKitContext.Provider
      value={{ manager, participantsWithTracks, setParticipantsWithTracks }}
    >
      {children}
    </LiveKitContext.Provider>
  );
};

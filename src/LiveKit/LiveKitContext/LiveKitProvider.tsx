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
          videoPublication: null,
          audioPublication: null,
          audioTracks: [],
          videoTracks: [],
        };
        if (track.kind === "video") {
          existing.videoPublication = publication;
          existing.videoTracks = [...existing.videoTracks, track];
        } else if (track.kind === "audio") {
          existing.audioPublication = publication;
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
          videoPublication: null,
          audioPublication: null,
          audioTracks: [],
          videoTracks: [],
        };
        if (track.kind === "video") {
          existing.videoTracks = existing.videoTracks.filter((v) => v !== track);
          if (existing.videoPublication === publication) {
            existing.videoPublication = null;
          }
        } else if (track.kind === "audio") {
          existing.audioTracks = existing.audioTracks.filter((a) => a !== track);
          if (existing.audioPublication === publication) {
            existing.audioPublication = null;
          }
        }
        if (existing.videoTracks.length === 0 && existing.audioTracks.length === 0) {
          newMap.delete(participantId);
        } else {
          newMap.set(participantId, existing);
        }
        return newMap;
      });
    };

    const unsubscribeTrackSubscribed =
      manager.onTrackSubscribed(handleTrackSubscribed);
    const unsubscribeTrackUnsubscribed =
      manager.onTrackUnsubscribed(handleTrackUnsubscribed);
    const unsubscribeDisconnected = manager.onDisconnected(() => {
      setParticipantsWithTracks(new Map());
    });

    return () => {
      unsubscribeTrackSubscribed();
      unsubscribeTrackUnsubscribed();
      unsubscribeDisconnected();
    };
  }, [manager]);

  return (
    <LiveKitContext.Provider
      value={{ manager, participantsWithTracks, setParticipantsWithTracks }}
    >
      {children}
    </LiveKitContext.Provider>
  );
};

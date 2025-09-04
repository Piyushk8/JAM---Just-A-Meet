import { useLiveKit } from "@/LiveKit/LiveKitContext/Context";
import { useUserLocalMedia } from "@/Providers/LocalMedia/Context";
import type { RootState } from "@/Redux";
import React from "react";
import { useSelector } from "react-redux";
import MediaControls from "./MediaControls";
import ParticipantMedia from "./ParticipantsMedia";

interface RoomMediaBarProps {
  position?: "top" | "bottom" | "left" | "right";
  maxVisible?: number;
  showControls?: boolean;
}

const RoomMediaBar: React.FC<RoomMediaBarProps> = ({
  position = "top",
  maxVisible = 6,
  showControls = true,
}) => {
  const { currentUser, usersInRoom, nearbyParticipants } = useSelector(
    (state: RootState) => state.roomState
  );
  const { participantsWithTracks } = useLiveKit();
  const {
    audioTrack: localAudioTrack,
    videoTrack: localVideoTrack,
    enableAudio,
    disableAudio,
    enableVideo,
    disableVideo,
  } = useUserLocalMedia();

  const isAudioEnabled = !!localAudioTrack;
  const isVideoEnabled = !!localVideoTrack;

  const handleToggleAudio = async () => {
    if (isAudioEnabled) {
      await disableAudio();
    } else {
      await enableAudio();
    }
  };

  const handleToggleVideo = async () => {
    try {
      if (isVideoEnabled) {
        await disableVideo();
      } else {
        await enableVideo();
      }
    } catch (error) {
      console.log("error toggle video");
    }
  };

  const nearbyUsers = React.useMemo(() => {
    return nearbyParticipants.map((u) => usersInRoom[u]);
  }, [nearbyParticipants, usersInRoom]);

  const allUsers = React.useMemo(() => {
    const others = nearbyUsers;
    return currentUser ? [currentUser, ...others] : others;
  }, [currentUser, nearbyParticipants]);

  const visibleUsers = allUsers.slice(0, maxVisible);
  const hasOverflow = allUsers.length > maxVisible;

  const getContainerClasses = () => {
    const base = "fixed z-20";
    switch (position) {
      case "top":
        return `${base} top-0 left-0 right-0 flex flex-col items-center justify-center p-4`;
      case "bottom":
        return `${base} bottom-0 left-0 right-0 flex flex-col items-center justify-center p-4`;
      case "left":
        return `${base} left-0 top-0 bottom-0 flex flex-col items-center justify-start p-4 overflow-y-auto`;
      case "right":
        return `${base} right-0 top-0 bottom-0 flex flex-col items-center justify-start p-4 overflow-y-auto`;
      default:
        return `${base} top-0 left-0 right-0 flex flex-col items-center justify-center p-4`;
    }
  };

  const getContentClasses = () => {
    switch (position) {
      case "left":
      case "right":
        return "flex flex-col space-y-4 max-h-full overflow-y-auto";
      default:
        return "flex space-x-4 overflow-x-auto max-w-full";
    }
  };

  if (allUsers.length === 0) return null;
  return (
    <div className={getContainerClasses()}>
      {showControls && (
        <MediaControls
          isAudioEnabled={isAudioEnabled}
          isVideoEnabled={isVideoEnabled}
          onToggleAudio={handleToggleAudio}
          onToggleVideo={handleToggleVideo}
        />
      )}

      <div className={getContentClasses()}>
        {visibleUsers.map((user) => {
          const isCurrentUserItem = user.id === currentUser?.id;
          let videoTrack, audioTrack;

          if (isCurrentUserItem) {
            videoTrack = localVideoTrack;
            audioTrack = localAudioTrack;
          } else {
            const userTracks = participantsWithTracks.get(user.id);
            videoTrack = userTracks?.videoTracks[0];
            audioTrack = userTracks?.audioTracks[0];
          }

          return (
            <ParticipantMedia
              key={user.id}
              user={user}
              videoTrack={videoTrack}
              audioTrack={audioTrack}
              isCurrentUser={isCurrentUserItem}
              isLocal={isCurrentUserItem}
            />
          );
        })}

        {hasOverflow && (
          <div className="flex items-center justify-center p-4 text-white text-sm">
            +{allUsers.length - maxVisible} more
          </div>
        )}
      </div>
    </div>
  );
};

export default RoomMediaBar;

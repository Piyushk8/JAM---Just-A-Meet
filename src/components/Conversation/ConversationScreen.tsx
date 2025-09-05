import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { useSocket } from "@/SocketProvider";
import type { User } from "@/types/types";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "@/Redux";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Settings,
  MoreVertical,
  Users,
  MessageSquare,
  Share,
  Grid3X3,
} from "lucide-react";
import {
  addUserInConversation,
  pendingToMemberInConversation,
} from "@/Redux/misc";
import { liveKitManager } from "@/LiveKit/liveKitManager";
import { ParticipantVideo } from "./ParticipantVideo";
import { useLiveKit } from "@/LiveKit/LiveKitContext/Context";
import PendingScreen from "./PendingScreen";
import JoiningScreen from "./JoiningScreen";
import { useUserLocalMedia } from "@/Providers/LocalMedia/Context";
import { LocalPreview } from "./LocalPreview";
import NearbyUsers from "../NearbyUserList/NearbyUserList";

interface CallParticipant extends User {
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isLocal?: boolean;
}

export default function CallScreen() {
  const [status, setStatus] = useState<
    "pending" | "ongoing" | "ended" | "joining"
  >("pending");
  const [participants, setParticipants] = useState<CallParticipant[]>([]);
  const [localVideo, _setLocalVideo] = useState(true);
  const [localAudio, _setLocalAudio] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [callDuration, setCallDuration] = useState(0);

  const callStartTime = useRef<number>(0);

  const { OnGoingConversations } = useSelector(
    (state: RootState) => state.miscSlice
  );
  const { participantsWithTracks } = useLiveKit();
  useEffect(() => {
    if (OnGoingConversations?.status === "ongoing" && status === "pending") {
      setStatus("joining");
    }
  }, [OnGoingConversations?.status, status]);

  const { usersInRoom, currentUser } = useSelector(
    (state: RootState) => state.roomState
  );
  const dispatch = useDispatch();
  const socket = useSocket();
 
  // for timer
  useEffect(() => {
    if (status === "ongoing" && callStartTime.current === 0) {
      callStartTime.current = Date.now();
    }

    const interval = setInterval(() => {
      if (status === "ongoing" && callStartTime.current > 0) {
        setCallDuration(
          Math.floor((Date.now() - callStartTime.current) / 1000)
        );
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [status]);
  // Auto-hide controls
  useEffect(() => {
    if (status === "ongoing") {
      const timer = setTimeout(() => setShowControls(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showControls, status]);

  // Initialize local video preview

  useEffect(() => {
    if (!OnGoingConversations) return;

    const { conversationId } = OnGoingConversations;

    // Set initial participants
    // const callParticipants = members
    //   .map((id: string) => {
    //     const user = usersInRoom[id];
    //     return {
    //       ...user,
    //       isVideoEnabled: true,
    //       isAudioEnabled: true,
    //       isLocal: id === currentUser?.id,
    //     };
    //   })
    //   .filter(Boolean);

    // setParticipants(callParticipants);
    //@ts-ignore
    const handleAccepted = ({ conversationId, targetUserId }) => {
      if (OnGoingConversations.conversationId == conversationId) {
        console.log(
          "🔍 Before sync - participantsWithTracks size:",
          participantsWithTracks.size
        );

        liveKitManager.syncSubscriptions([targetUserId], []);
        dispatch(addUserInConversation(targetUserId));
        dispatch(pendingToMemberInConversation(targetUserId));
        // Add delay to check later
        setTimeout(() => {
          console.log(
            "🔍 After sync - participantsWithTracks size:",
            participantsWithTracks.size
          );
        }, 2000);

        setStatus("ongoing");
      }
    };

    const handleDeclined = (data: { conversationId: string }) => {
      if (data.conversationId === conversationId) {
        setStatus("ended");
      }
    };
    
    const handleParticipantJoined = (data: {
      userId: string;
      conversationId: string;
    }) => {
      if (data.conversationId === conversationId) {
        const user = usersInRoom[data.userId];
        if (user && !participants.find((p) => p.id === data.userId)) {
          setParticipants((prev) => [
            ...prev,
            {
              ...user,
              isVideoEnabled: true,
              isAudioEnabled: true,
            },
          ]);
        }
      }
    };

    const handleMediaStateChange = (data: {
      userId: string;
      isVideoEnabled: boolean;
      isAudioEnabled: boolean;
    }) => {
      setParticipants((prev) =>
        prev.map((p) =>
          p.id === data.userId
            ? {
                ...p,
                isVideoEnabled: data.isVideoEnabled,
                isAudioEnabled: data.isAudioEnabled,
              }
            : p
        )
      );
    };

    socket.on("call-accepted-response", handleAccepted);
    socket.on("call-declined", handleDeclined);
    // socket.on("participant-joined", handleParticipantJoined);
    socket.on("user-media-state-changed", handleMediaStateChange);

    return () => {
      socket.off("call-declined", handleDeclined);
      socket.off("call-accepted-response", handleAccepted);
      //   socket.off("participant-joined", handleParticipantJoined);
      socket.off("user-media-state-changed", handleMediaStateChange);
    };
  }, [OnGoingConversations, socket, usersInRoom, currentUser]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };
  const {
    audioTrack,
    videoTrack,
    enableAudio,
    disableAudio,
    enableVideo,
    disableVideo,
  } = useUserLocalMedia();

  const toggleLocalVideo = async () => {
    if (videoTrack) {
      await disableVideo();
    } else {
      await enableVideo();
    }
    socket.emit("media-state-changed", {
      isVideoEnabled: !!videoTrack,
      isAudioEnabled: !!audioTrack,
    });
  };

  const toggleLocalAudio = async () => {
    if (audioTrack) {
      await disableAudio();
    } else {
      await enableAudio();
    }
    socket.emit("media-state-changed", {
      isVideoEnabled: !!videoTrack,
      isAudioEnabled: !!audioTrack,
    });
  };

  const endCall = () => {
    socket.emit("leave-conversation", {
      conversationId: OnGoingConversations!.conversationId,
    });
    setStatus("ended");
  };

  const getGridClass = (participantCount: number) => {
    if (participantCount === 1) return "grid-cols-1";
    if (participantCount === 2) return "grid-cols-2";
    if (participantCount <= 4) return "grid-cols-2";
    if (participantCount <= 9) return "grid-cols-3";
    return "grid-cols-4";
  };



  if (status === "pending") {
    return <PendingScreen endCall={endCall} />;
  }

  if (status == "joining") {
    return (
      <JoiningScreen
        status={status}
        joinCall={() => setStatus("ongoing")}
        endCall={endCall}
      />
    );
  }

  if (status === "ongoing") {
    return (
      <motion.div
        className="fixed inset-0 bg-black z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onMouseMove={() => setShowControls(true)}
      >
        {/* Main video grid */}
        <div className="h-full p-4">
          <div
            className={`grid ${getGridClass(
              participantsWithTracks.size + 1
            )} gap-2 h-full`}
          >
            {/* Local participant */}
            {videoTrack || audioTrack ? (
             <LocalPreview/>
            ) : null}

            {/* Remote participants */}
            {OnGoingConversations?.members.map((memberId) => {
              const tracksAndPublications =
                participantsWithTracks.get(memberId);
              const user = usersInRoom[memberId];

              if (!tracksAndPublications || !user) return null;

              return (
                <ParticipantVideo
                  username={user.username}
                  isLocal={user.id === currentUser?.id}
                  publications={tracksAndPublications}
                  key={memberId}
                />
              );
            })}
          </div>
        </div>

        {/* Top bar */}
        <motion.div
          className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/50 to-transparent p-4"
          initial={{ opacity: 1 }}
          animate={{ opacity: showControls ? 1 : 0 }}
        >
          <div className="flex justify-between items-center text-white">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold">Video Call</h2>
              <span className="text-sm opacity-75">
                {formatDuration(callDuration)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="text-white">
                <Users />
              </Button>
              <Button variant="ghost" size="icon" className="text-white">
                <MessageSquare />
              </Button>
              <Button variant="ghost" size="icon" className="text-white">
                <MoreVertical />
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Bottom controls */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-6"
          initial={{ opacity: 1 }}
          animate={{ opacity: showControls ? 1 : 0 }}
        >
          <div className="flex justify-center items-center gap-4">
            <Button
              variant={localAudio ? "secondary" : "destructive"}
              size="lg"
              className="rounded-full"
              onClick={toggleLocalAudio}
            >
              {localAudio ? <Mic /> : <MicOff />}
            </Button>

            <Button
              variant={localVideo ? "secondary" : "destructive"}
              size="lg"
              className="rounded-full"
              onClick={toggleLocalVideo}
            >
              {localVideo ? <Video /> : <VideoOff />}
            </Button>

            <Button
              variant="ghost"
              size="lg"
              className="rounded-full text-white"
            >
              <Share />
            </Button>

            <Button
              variant="ghost"
              size="lg"
              className="rounded-full text-white"
            >
              <Grid3X3 />
            </Button>

            <Button
              variant="ghost"
              size="lg"
              className="rounded-full text-white"
            >
              <Settings />
            </Button>

            <Button
              variant="destructive"
              size="lg"
              className="rounded-full"
              onClick={endCall}
            >
              <PhoneOff />
            </Button>
          </div>
        </motion.div>

        {/* Participants count */}
        <div className="absolute top-20 left-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
          {OnGoingConversations?.members.length} participant
          {OnGoingConversations?.members.length !== 1 ? "s" : ""}
        </div>
        <>
        <NearbyUsers/>
        </>
      </motion.div>
    );
  }

  if (status === "ended") {
    return (
      <motion.div
        className="fixed inset-0 bg-black/90 flex items-center justify-center z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="bg-white rounded-2xl shadow-xl p-8 w-[400px] max-w-full text-center">
          <div className="mb-6">
            <PhoneOff className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Call Ended</h3>
            <p className="text-gray-600">
              Call duration: {formatDuration(callDuration)}
            </p>
          </div>

          <Button onClick={() => window.location.reload()} className="w-full">
            Return to Room
          </Button>
        </div>
      </motion.div>
    );
  }

  return null;
}

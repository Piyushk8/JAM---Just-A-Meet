import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { useSocket } from "@/SocketProvider";
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
  closeCallScreen,
  deleteConversation,
} from "@/Redux/misc";
import { liveKitManager } from "@/LiveKit/liveKitManager";
import { ParticipantVideo } from "./ParticipantVideo";
import { useLiveKit } from "@/LiveKit/LiveKitContext/Context";
import PendingScreen from "./PendingScreen";
import JoiningScreen from "./JoiningScreen";
import { useUserLocalMedia } from "@/Providers/LocalMedia/Context";
import { LocalPreview } from "./LocalPreview";
import NearbyUsers from "../NearbyUserList/NearbyUserList";

export default function CallScreen() {
  const [status, setStatus] = useState<
    "pending" | "ongoing" | "ended" | "joining"
  >("pending");
  const [showControls, setShowControls] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const callStartTime = useRef<number>(0);

  const dispatch = useDispatch();
  const socket = useSocket();
  const { participantsWithTracks } = useLiveKit();
  const { OnGoingConversations } = useSelector(
    (state: RootState) => state.miscSlice
  );
  const { usersInRoom, currentUser } = useSelector(
    (state: RootState) => state.roomState
  );
  const {
    audioTrack,
    videoTrack,
    enableAudio,
    disableAudio,
    enableVideo,
    disableVideo,
  } = useUserLocalMedia();

  const isLocalVideoEnabled = !!videoTrack;
  const isLocalAudioEnabled = !!audioTrack;
  const remoteMemberIds =
    OnGoingConversations?.members.filter(
      (memberId) => memberId !== currentUser?.id
    ) ?? [];

  useEffect(() => {
    if (OnGoingConversations?.status === "ongoing" && status === "pending") {
      setStatus("joining");
    }
  }, [OnGoingConversations?.status, status]);

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

  useEffect(() => {
    if (status === "ongoing" && showControls) {
      const timer = setTimeout(() => setShowControls(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showControls, status]);

  useEffect(() => {
    if (!OnGoingConversations) return;

    const { conversationId } = OnGoingConversations;

    const handleAccepted = ({
      conversationId: acceptedConversationId,
      targetUserId,
    }: {
      conversationId: string;
      targetUserId: string;
    }) => {
      if (conversationId !== acceptedConversationId) return;

      liveKitManager.syncSubscriptions([targetUserId], []);
      dispatch(addUserInConversation(targetUserId));
      dispatch(pendingToMemberInConversation(targetUserId));
      setStatus("ongoing");
    };

    const handleDeclined = (data: { conversationId: string }) => {
      if (data.conversationId === conversationId) {
        setStatus("ended");
      }
    };

    socket.on("call-accepted-response", handleAccepted);
    socket.on("call-declined", handleDeclined);

    return () => {
      socket.off("call-declined", handleDeclined);
      socket.off("call-accepted-response", handleAccepted);
    };
  }, [OnGoingConversations, socket, dispatch]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const toggleLocalVideo = async () => {
    const nextVideoEnabled = videoTrack
      ? await disableVideo()
      : await enableVideo();

    socket.emit("media-state-changed", {
      isVideoEnabled: nextVideoEnabled,
      isAudioEnabled: !!audioTrack,
    });
  };

  const toggleLocalAudio = async () => {
    const nextAudioEnabled = audioTrack
      ? await disableAudio()
      : await enableAudio();

    socket.emit("media-state-changed", {
      isVideoEnabled: !!videoTrack,
      isAudioEnabled: nextAudioEnabled,
    });
  };

  const endCall = () => {
    if (!OnGoingConversations) return;
    socket.emit("leave-conversation", {
      conversationId: OnGoingConversations.conversationId,
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

  if (status === "joining") {
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
        className="fixed inset-0 z-50 bg-black"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onMouseMove={() => setShowControls(true)}
      >
        <div className="h-full p-4">
          <div
            className={`grid ${getGridClass(remoteMemberIds.length + 1)} h-full gap-2`}
          >
            <LocalPreview />

            {remoteMemberIds.map((memberId) => {
              const user = usersInRoom[memberId];
              if (!user) return null;

              return (
                <ParticipantVideo
                  key={memberId}
                  username={user.username}
                  publications={participantsWithTracks.get(memberId)}
                />
              );
            })}
          </div>
        </div>

        <motion.div
          className="absolute left-0 right-0 top-0 bg-gradient-to-b from-black/50 to-transparent p-4"
          initial={{ opacity: 1 }}
          animate={{ opacity: showControls ? 1 : 0 }}
        >
          <div className="flex items-center justify-between text-white">
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

        <motion.div
          className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-6"
          initial={{ opacity: 1 }}
          animate={{ opacity: showControls ? 1 : 0 }}
        >
          <div className="flex items-center justify-center gap-4">
            <Button
              variant={isLocalAudioEnabled ? "secondary" : "destructive"}
              size="lg"
              className="rounded-full"
              onClick={toggleLocalAudio}
            >
              {isLocalAudioEnabled ? <Mic /> : <MicOff />}
            </Button>

            <Button
              variant={isLocalVideoEnabled ? "secondary" : "destructive"}
              size="lg"
              className="rounded-full"
              onClick={toggleLocalVideo}
            >
              {isLocalVideoEnabled ? <Video /> : <VideoOff />}
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

        <div className="absolute left-4 top-20 rounded-full bg-black/50 px-3 py-1 text-sm text-white">
          {OnGoingConversations?.members.length} participant
          {OnGoingConversations?.members.length !== 1 ? "s" : ""}
        </div>

        <NearbyUsers />
      </motion.div>
    );
  }

  if (status === "ended") {
    return (
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="w-[400px] max-w-full rounded-2xl bg-white p-8 text-center shadow-xl">
          <div className="mb-6">
            <PhoneOff className="mx-auto mb-4 h-16 w-16 text-red-500" />
            <h3 className="mb-2 text-xl font-semibold">Call Ended</h3>
            <p className="text-gray-600">
              Call duration: {formatDuration(callDuration)}
            </p>
          </div>

          <Button 
            onClick={() => {
              dispatch(closeCallScreen());
              dispatch(deleteConversation("")); // Clear conversation
            }} 
            className="w-full"
          >
            Return to Room
          </Button>
        </div>
      </motion.div>
    );
  }

  return null;
}

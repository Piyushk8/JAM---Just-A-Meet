import React, { useRef, useEffect } from "react";
import { motion } from "motion/react";
import { Button } from "../ui/button";
import { Mic, MicOff, PhoneOff, Video, VideoOff } from "lucide-react";
import { useUserLocalMedia } from "@/Providers/LocalMedia/Context";

const JoiningScreen = ({
  joinCall,
  endCall,
  status,
}: {
  joinCall: () => void;
  endCall: () => void;
  status: "pending" | "joining";
}) => {
  const {
    audioTrack,
    videoTrack,
    enableAudio,
    disableAudio,
    enableVideo,
    disableVideo,
  } = useUserLocalMedia();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  
  // Attach/detach the local video track
  useEffect(() => {
    if (videoTrack && localVideoRef.current) {
      videoTrack.attach(localVideoRef.current);
      return () => {
        videoTrack.detach(localVideoRef.current!);
      };
    }
  }, [videoTrack]);

  const toggleLocalVideo = () => {
    if (videoTrack) {
      disableVideo();
    } else {
      enableVideo();
    }
  };

  const toggleLocalAudio = () => {
    if (audioTrack) {
      disableAudio();
    } else {
      enableAudio();
    }
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/90 flex items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="bg-white rounded-2xl shadow-xl p-6 w-[500px] max-w-full">
        <div className="flex flex-col items-center gap-6">
          {/* Video preview */}
          <div className="w-64 h-48 bg-gray-900 rounded-lg overflow-hidden">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          </div>

          <div className="text-center">
            <h3 className="text-xl font-semibold mb-2">Joining...</h3>
            <p className="text-gray-600">Connecting to call</p>
          </div>

          {/* Controls */}
          <div className="flex gap-3">
            <Button
              variant={videoTrack ? "default" : "destructive"}
              size="icon"
              onClick={toggleLocalVideo}
            >
              {videoTrack ? <Video /> : <VideoOff />}
            </Button>

            <Button
              variant={audioTrack ? "default" : "destructive"}
              size="icon"
              onClick={toggleLocalAudio}
            >
              {audioTrack ? <Mic /> : <MicOff />}
            </Button>

            {status === "joining" ? (
              <Button variant="default" onClick={joinCall}>
                Join Call
              </Button>
            ) : (
              <Button variant="destructive" onClick={endCall}>
                <PhoneOff className="mr-2" /> Cancel
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default JoiningScreen;

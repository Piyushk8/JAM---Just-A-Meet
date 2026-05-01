import React from "react";
import { Mic, MicOff, Video, VideoOff } from "lucide-react";

interface MediaControlsProps {
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
}

const MediaControls: React.FC<MediaControlsProps> = ({
  isAudioEnabled,
  isVideoEnabled,
  onToggleAudio,
  onToggleVideo,
}) => {
  return (
    <div className="flex space-x-3 mt-2">
      {/* Audio Button */}
      <button
        onClick={onToggleAudio}
        aria-label={isAudioEnabled ? "Mute microphone" : "Unmute microphone"}
        className={`w-10 h-10 flex items-center justify-center rounded-full
          transition-all duration-200 active:scale-95
          ${
            isAudioEnabled
              ? "bg-slate-800 text-green-400 ring-1 ring-green-500/40 hover:bg-slate-700"
              : "bg-red-900/60 text-red-400 ring-1 ring-red-500/40 hover:bg-red-800/60"
          }`}
      >
        {isAudioEnabled ? (
          <Mic className="w-5 h-5 transition-transform duration-200 hover:scale-110" />
        ) : (
          <MicOff className="w-5 h-5 transition-transform duration-200 hover:scale-110" />
        )}
      </button>

      {/* Video Button */}
      <button
        onClick={onToggleVideo}
        aria-label={isVideoEnabled ? "Turn off camera" : "Turn on camera"}
        className={`w-10 h-10 flex items-center justify-center rounded-full
          transition-all duration-200 active:scale-95
          ${
            isVideoEnabled
              ? "bg-slate-800 text-green-400 ring-1 ring-green-500/40 hover:bg-slate-700"
              : "bg-red-900/60 text-red-400 ring-1 ring-red-500/40 hover:bg-red-800/60"
          }`}
      >
        {isVideoEnabled ? (
          <Video className="w-5 h-5 transition-transform duration-200 hover:scale-110" />
        ) : (
          <VideoOff className="w-5 h-5 transition-transform duration-200 hover:scale-110" />
        )}
      </button>
    </div>
  );
};
export default MediaControls;

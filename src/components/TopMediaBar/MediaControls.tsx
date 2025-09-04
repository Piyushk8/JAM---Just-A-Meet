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
        className={`w-10 h-10 flex items-center justify-center rounded-full
          bg-slate-800 text-slate-200 
          hover:bg-slate-700 active:scale-95
          transition-all duration-200`}
      >
        {isAudioEnabled ? (
          <Mic className="w-5 h-5 transition-transform duration-200 hover:scale-110" />
        ) : (
          <MicOff className="w-5 h-5 transition-transform duration-200 hover:scale-110 text-slate-400" />
        )}
      </button>

      {/* Video Button */}
      <button
        onClick={onToggleVideo}
        className={`w-10 h-10 flex items-center justify-center rounded-full
          bg-slate-800 text-slate-200 
          hover:bg-slate-700 active:scale-95
          transition-all duration-200`}
      >
        {isVideoEnabled ? (
          <Video className="w-5 h-5 transition-transform duration-200 hover:scale-110" />
        ) : (
          <VideoOff className="w-5 h-5 transition-transform duration-200 hover:scale-110 text-slate-400" />
        )}
      </button>
    </div>
  );
};
export default MediaControls;

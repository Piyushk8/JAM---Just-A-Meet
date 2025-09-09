import React, { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DropdownMenuCheckboxItem } from "@radix-ui/react-dropdown-menu";
import {
  ChevronDownIcon,
  ChevronUp,
  Mic,
  MicOff,
  VideoIcon,
  VideoOff,
} from "lucide-react";

interface Props {
  videoOn: boolean;
  toggleVideo: () => void;
  showVideoDropdown: boolean;
  setShowVideoDropdown: (show: boolean) => void;
  videoDevices: MediaDeviceInfo[];
  handleVideoChange: (deviceId: string) => void;
  selectedVideo: string | null;
  setSelectedVideo: (deviceId: string) => void;
}

const VideoSelection = ({
  videoOn,
  toggleVideo,
  showVideoDropdown,
  setShowVideoDropdown,
  videoDevices,
  handleVideoChange,
  selectedVideo,
  setSelectedVideo,
}: Props) => {
  return (
    <div
      className={`px-4 py-2 flex items-center gap-2 rounded-2xl transition ${
        videoOn ? "bg-green-500 text-white" : "bg-red-500 text-red-200"
      }`}
    >
      <button onClick={toggleVideo}>
        {videoOn ? <VideoIcon size={18} /> : <VideoOff size={18} />}
      </button>

      <p className="opacity-50">|</p>
      <DropdownMenu
        open={showVideoDropdown}
        onOpenChange={setShowVideoDropdown}
      >
        <DropdownMenuTrigger asChild>
          <span>
            {showVideoDropdown ? (
              <ChevronUp size={18} />
            ) : (
              <ChevronDownIcon size={18} />
            )}
          </span>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="w-48 text-sm text-gray-800 rounded-md shadow-lg z-50">
          <DropdownMenuLabel>Video Devices</DropdownMenuLabel>
          {videoDevices.map((device) => (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                className="cursor-pointer"
                key={device.deviceId}
                checked={selectedVideo === device.deviceId}
                onCheckedChange={() => setSelectedVideo(device.deviceId)}
                onClick={() => handleVideoChange(device.deviceId)}
              >
                {device.label || `Camera ${device.deviceId}`}
              </DropdownMenuCheckboxItem>
            </>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default VideoSelection;

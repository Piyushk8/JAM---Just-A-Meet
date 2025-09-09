// VideoPreview.tsx
import React from "react";

interface Props {
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

const VideoPreview = React.memo(({ videoRef }: Props) => {
  return (
    <video
      ref={videoRef}
      className="w-64 h-48 md:w-80 md:h-60 bg-gray-900 rounded-xl object-cover"
      autoPlay
      muted
    />
  );
});

export default VideoPreview;

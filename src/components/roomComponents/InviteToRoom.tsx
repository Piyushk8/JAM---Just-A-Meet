import type { RootState } from "@/Redux";
import { LucideShare2, Zap } from "lucide-react";
import React, { useState } from "react";
import { useSelector } from "react-redux";
import { AnimatePresence, motion } from "motion/react";
import { RoomThemesId } from "@/types/roomTypes";

const InviteToRoom = () => {
  const [isHovered, setIsHovered] = useState(false);
  const { roomTheme } = useSelector((state: RootState) => state.roomState);
  const [copied, setCopied] = useState(false);

  const { currentUser } = useSelector((state: RootState) => state.roomState);

  const handleInvite = async () => {
    try {
      if (currentUser?.roomId) {
        await navigator.clipboard.writeText(
          currentUser?.roomId + (roomTheme ? `&${RoomThemesId[roomTheme]}` : "")
        );
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.error("Failed to copy!", err);
    }
  };

  return (
    <motion.div className="relative">
      <motion.button
        onClick={handleInvite}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        whileHover={{
          scale: 1.1,
        }}
        className={`
        relative group flex justify-center items-center p-3 rounded-xl
        bg-gradient-to-br from-blue-600 via-blue-500 to-white
        hover:from-blue-700 hover:via-blue-600 hover:to-blue-100
        shadow-lg hover:shadow-xl transform transition-all duration-300 ease-out
        border border-white/30
        overflow-hidden
      `}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-700" />

        <LucideShare2 className="size-5 text-white relative z-10" />
      </motion.button>
      <AnimatePresence>
        {copied && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 10 }}
            exit={{ opacity: 0, y: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute  left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs whitespace-nowrap backdrop-blur-sm border border-white/10 px-4 py-2 rounded shadow-lg"
          >
            <Zap className="inline w-3 h-3 mr-1 text-yellow-400" />
            Copied! You can invite others.
            <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-black/80 rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default InviteToRoom;

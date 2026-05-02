import { AnimatePresence, motion } from "motion/react";
import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../../Redux";
import { ChevronUp, ChevronDown, PhoneCallIcon, Users, Signal, X } from "lucide-react";
import { useSocket } from "@/SocketProvider";
import type { Conversation } from "@/types/types";
import { addConversation, openCallScreen } from "@/Redux/misc";

interface NearbyUsersProps {}

const NearbyUsers: React.FC<NearbyUsersProps> = () => {
  const socket = useSocket();
  const { nearbyParticipants, usersInRoom } = useSelector(
    (state: RootState) => state.roomState
  );
  const dispatch = useDispatch();
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const nearbyUsers = Object.values(usersInRoom).filter((u) =>
    nearbyParticipants.includes(u.id)
  );

  const handleInviteOnCall = (userId: string) => {
    if (!userId) return;

    socket?.emit(
      "call:invite",
      { targetUserId: userId },
      (res: { success: boolean; conversation: Conversation }) => {
        const { conversation } = res;
        if (!conversation) return;
        dispatch(
          addConversation({
            conversationId: conversation.conversationId,
            createdAt: conversation.createdAt,
            members: conversation.members,
            pending: conversation.pending,
            creator: conversation.creator,
            status: "pending",
          })
        );
        dispatch(openCallScreen());
      }
    );
  };

  const statusColors: Record<string, string> = {
    available: "bg-emerald-500",
    idle: "bg-emerald-500",
    away: "bg-amber-500",
    busy: "bg-rose-500",
    offline: "bg-slate-400",
  };

  // Mobile rendering (Floating Action Button + Modal)
  if (isMobile) {
    return (
      <div className="fixed bottom-20 right-4 z-40 flex flex-col items-end">
        <AnimatePresence>
          {!isOpen && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-14 h-14 flex items-center justify-center rounded-full bg-white/90 backdrop-blur-xl border border-white/50 text-slate-700 shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-shadow z-50 relative mb-2"
              onClick={() => setIsOpen(true)}
            >
              <Users className="w-6 h-6 text-blue-600" />
              {nearbyUsers.length > 0 && (
                <span className="absolute top-0 right-0 flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-green-500 border-2 border-white"></span>
                </span>
              )}
            </motion.button>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95, transformOrigin: "bottom right" }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="w-[calc(100vw-2rem)] max-h-[60vh] flex flex-col bg-white/90 backdrop-blur-xl border border-white/50 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-hidden"
            >
              {/* Header */}
              <div className="flex justify-between items-center px-4 py-3 bg-white/50 border-b border-slate-200/60 backdrop-blur-md">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                    <Users className="w-4 h-4" />
                  </div>
                  <h3 className="text-slate-800 text-[15px] font-semibold flex items-center gap-2">
                    Nearby Users
                    <span className="bg-slate-100 text-slate-600 font-medium text-xs px-2 py-0.5 rounded-full">
                      {nearbyUsers.length}
                    </span>
                  </h3>
                </div>
                <button
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-200/50 hover:text-slate-800 transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="px-3 py-3 space-y-1.5 overflow-y-auto custom-scrollbar flex-1">
                {nearbyUsers?.length ? (
                  nearbyUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/60 border border-transparent hover:border-slate-100 transition-all group"
                    >
                      <div className="relative shrink-0">
                        <div className="w-11 h-11 rounded-full overflow-hidden bg-slate-100 shadow-sm border border-slate-200/50">
                          <img
                            src={user.sprite || "https://github.com/shadcn.png"}
                            alt={user.username}
                            className="w-full h-full object-cover"
                            style={{ imageRendering: "pixelated" }}
                          />
                        </div>
                        <span
                          className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-[2.5px] border-white shadow-sm ${
                            statusColors[user.availability] || statusColors.offline
                          }`}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-semibold text-slate-800 truncate leading-tight">
                          {user.username}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Signal className={`w-3 h-3 ${user.availability === 'idle' ? 'text-emerald-500' : 'text-slate-400'}`} />
                          <p className="text-xs font-medium text-slate-500 capitalize truncate">
                            {user.availability}
                          </p>
                        </div>
                      </div>

                      {user.availability === "idle" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInviteOnCall(user.id);
                          }}
                          className="shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-blue-50 hover:bg-blue-500 text-blue-600 hover:text-white transition-all duration-200 shadow-sm hover:shadow-md active:scale-95 group/btn"
                          title="Invite to call"
                        >
                          <PhoneCallIcon className="w-4 h-4 transition-transform group-hover/btn:scale-110" />
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                      <Users className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="text-[15px] font-medium text-slate-700">No one nearby</p>
                    <p className="text-sm text-slate-500 mt-1">Move closer to other users to see them here.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Desktop rendering (Collapsible bottom-left widget)
  return (
    <div
      className={`
        fixed z-30 transition-all duration-300 ease-in-out
        bottom-4 left-4 w-80
        bg-white/85 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-white/50
        flex flex-col overflow-hidden
        ${isOpen ? "max-h-[500px]" : "max-h-14"}
      `}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 h-14 cursor-pointer hover:bg-black/5 active:bg-black/10 transition-colors select-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600">
            <Users className="w-4 h-4" />
            {nearbyUsers.length > 0 && (
              <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full animate-pulse" />
            )}
          </div>
          <h3 className="text-[15px] font-semibold text-slate-800 flex items-center gap-2">
            Nearby Users
            <span className="bg-slate-100 text-slate-600 font-medium text-xs px-2 py-0.5 rounded-full">
              {nearbyUsers.length}
            </span>
          </h3>
        </div>
        <div className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 text-slate-500">
          {isOpen ? (
            <ChevronDown className="w-5 h-5 transition-transform" />
          ) : (
            <ChevronUp className="w-5 h-5 transition-transform" />
          )}
        </div>
      </div>

      {/* Content */}
      <div 
        className={`transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      >
        <div className="px-3 pb-3 space-y-1.5 overflow-y-auto max-h-[440px] custom-scrollbar">
          {nearbyUsers?.length ? (
            nearbyUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/60 border border-transparent hover:border-slate-100 transition-all group"
              >
                <div className="relative shrink-0">
                  <div className="w-11 h-11 rounded-full overflow-hidden bg-slate-100 shadow-sm border border-slate-200/50">
                    <img
                      src={user.sprite || "https://github.com/shadcn.png"}
                      alt={user.username}
                      className="w-full h-full object-cover"
                      style={{ imageRendering: "pixelated" }}
                    />
                  </div>
                  <span
                    className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-[2.5px] border-white shadow-sm ${
                      statusColors[user.availability] || statusColors.offline
                    }`}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-semibold text-slate-800 truncate leading-tight">
                    {user.username}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Signal className={`w-3 h-3 ${user.availability === 'idle' ? 'text-emerald-500' : 'text-slate-400'}`} />
                    <p className="text-xs font-medium text-slate-500 capitalize truncate">
                      {user.availability}
                    </p>
                  </div>
                </div>

                {user.availability === "idle" && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleInviteOnCall(user.id);
                    }}
                    className="shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-blue-50 hover:bg-blue-500 text-blue-600 hover:text-white transition-all duration-200 shadow-sm hover:shadow-md active:scale-95 group/btn"
                    title="Invite to call"
                  >
                    <PhoneCallIcon className="w-4 h-4 transition-transform group-hover/btn:scale-110" />
                  </button>
                )}
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                <Users className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-[15px] font-medium text-slate-700">No one nearby</p>
              <p className="text-sm text-slate-500 mt-1">Move closer to other users to see them here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NearbyUsers;

import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../../Redux";
import { ChevronUp, ChevronDown, PhoneCallIcon } from "lucide-react";
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
    available: "bg-green-500",
    idle: "bg-green-500",
    away: "bg-yellow-500",
    busy: "bg-red-500",
    offline: "bg-gray-400",
  };

  return (
    <div
      className={`
        fixed left-4 bottom-4 z-50 w-64
        bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/20
        transition-all duration-300 ease-out
        ${isOpen ? "h-auto max-h-96" : "h-12"}
      `}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 h-12 cursor-pointer hover:bg-white/10 rounded-t-2xl transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          Nearby
          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">
            {nearbyUsers.length}
          </span>
        </h3>
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-gray-600" />
        ) : (
          <ChevronUp className="w-4 h-4 text-gray-600" />
        )}
      </div>

      {/* Content */}
      {isOpen && (
        <div className="px-3 pb-3 space-y-2 max-h-80 overflow-y-auto">
          {nearbyUsers?.length ? (
            nearbyUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group"
              >
                <div className="relative">
                  <img
                    src={user.sprite || "https://github.com/shadcn.png"}
                    alt={user.username}
                    className="w-10 h-10 rounded-full"
                  />
                  <span
                    className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                      statusColors[user.availability]
                    }`}
                  />
                </div>

                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">
                    {user.username}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">
                    {user.availability}
                  </p>
                </div>

                {user.availability === "idle" && (
                  <button
                    onClick={() => handleInviteOnCall(user.id)}
                    className="p-2 rounded-full hover:bg-blue-100 text-blue-600 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <PhoneCallIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-gray-500">No one nearby</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NearbyUsers;

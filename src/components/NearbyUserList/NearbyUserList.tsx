import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../../Redux";
import {
  ChevronUp,
  ChevronDown,
  PhoneCallIcon,
} from "lucide-react";
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

  const handleInviteOnCallWithId = (id: string) => {
    return (event: React.MouseEvent) => {
      handleInviteOnCall(id);
    };
  };
  const handleInviteOnCall = (userId: string) => {
    if (!userId) return;

    socket.emit(
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
            status:"pending"
          })
        );
        dispatch(openCallScreen());
      }
    );
    console.log("invitation sent from FE");
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
        fixed left-0 bottom-0 z-50
        w-56 sm:w-64 md:w-72
        bg-white dark:bg-gray-900 rounded-t-lg shadow-lg
        flex flex-col
        transition-all duration-300 ease-in-out
        ${isOpen ? "max-h-[50vh]" : "max-h-10"}
      `}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 h-10 bg-slate-400 cursor-pointer rounded-t-lg"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300">
          Nearby
        </h3>
        {isOpen ? (
          <ChevronDown className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        ) : (
          <ChevronUp className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        )}
      </div>

      <div
        className={`
          overflow-y-auto px-3 py-2 transition-opacity duration-200
          ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}
        `}
        style={{
          maxHeight: "calc(50vh - 2.5rem)", 
        }}
      >
        {nearbyUsers?.length ? (
          nearbyUsers.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-3 p-2 rounded-md cursor-pointer"
            >
              <img
                src={user.sprite || "https://github.com/shadcn.png"}
                alt={user.username}
                className="w-10 h-10 md:w-12 md:h-12 rounded-full"
              />
              <div className="flex-1">
                <p className="text-sm md:text-base font-medium text-gray-800 dark:text-gray-200">
                  {user.username}
                </p>
              </div>
              {user.availability == "idle" && (
                <>
                  <div
                    onClick={handleInviteOnCallWithId(user.id)}
                    className="hover:bg-slate-200 p-2 rounded-full h-fit w-fit"
                  >
                    <PhoneCallIcon className="size-5 hover:size-4 duration-200 text-foreground" />
                  </div>
                </>
              )}
              <span
                className={`w-3 h-3 md:w-4 md:h-4 rounded-full  transition-shadow duration-200 hover:shadow-[0_0_20px_rgba(34,197,94,0.8)] ${
                  statusColors[user.availability]
                }`}
              />
            </div>
          ))
        ) : (
          <p className="text-sm md:text-base text-gray-500 dark:text-gray-400">
            No one nearby
          </p>
        )}
      </div>
    </div>
  );
};

export default NearbyUsers;

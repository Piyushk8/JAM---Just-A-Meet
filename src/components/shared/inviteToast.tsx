// components/InvitationToasts.tsx

import { liveKitManager } from "@/LiveKit/liveKitManager";
import type { RootState } from "@/Redux";
import {
  addConversation,
  openCallScreen,
  removeInvitation,
} from "@/Redux/misc";
import { useSocket } from "@/SocketProvider";
import type { Conversation } from "@/types/types";
import { useDispatch, useSelector } from "react-redux";

import { Phone, PhoneOff, X } from "lucide-react";

export default function InvitationToasts() {
  const socket = useSocket();
  const { invitations } = useSelector((state: RootState) => state.miscSlice);
  const { usersInRoom, currentUser } = useSelector(
    (state: RootState) => state.roomState
  );
  const dispatch = useDispatch();
  
  const onDismiss = (invitationId: string) => {
    dispatch(removeInvitation(invitationId));
  };

  const onAccept = (invitationId: string) => {
  const [invitation] = invitations.filter((i) => i.id == invitationId);
  if (!currentUser) return;
  
  socket.emit(
    "call:accept",
    {
      conversationId: invitation.conversationId,
      targetUserId: currentUser?.id,
      from: invitation.from,
    },
    (res: {
      isConversationActive: boolean;
      conversation: Conversation | null;
    }) => {
      const { isConversationActive, conversation } = res;
      if (isConversationActive) {
        if (conversation && conversation.conversationId) {
          dispatch(
            addConversation({
              conversationId: conversation?.conversationId,
              createdAt: conversation.createdAt,
              creator: conversation.creator,
              members: conversation.members,
              pending: conversation.pending,
              status: conversation.status,
            })
          );
        }
        
        liveKitManager.toggleVideo(true);
        liveKitManager.toggleAudio(true);
        
        const otherMembers = conversation?.members.filter((m) => m != currentUser.id) ?? [];
        liveKitManager.syncSubscriptions(otherMembers, []);
        
        setTimeout(() => {
          liveKitManager.forceRefreshAllSubscriptions();
        }, 1000);
        
        dispatch(openCallScreen());
      } 
    }
  );

  dispatch(removeInvitation(invitation.id));
};
  
  
  const onDecline = (invitationId: string) => {
    const [invitation] = invitations.filter((i) => i.id == invitationId);
    if (!currentUser) return;
    socket.emit("call:decline", {
      conversationId: invitation.conversationId,
      userDeclined: currentUser.id,
      userThatInvited: invitation.from,
    });

    dispatch(removeInvitation(invitation.id));
  };
  const getUserNameFromId = (id: string) => {
    try {
      return usersInRoom[id].username ?? "anon";
    } catch (error) {
      return "anon";
    }
  };
  return (
    <div className="fixed bottom-6 right-6 space-y-4 z-[60] flex flex-col items-end pointer-events-none">
      {invitations.map((inv) => (
        <div
          key={inv.id}
          className="relative bg-slate-900/90 backdrop-blur-md border border-slate-700/50 shadow-2xl rounded-2xl p-5 w-80 flex flex-col pointer-events-auto transform transition-all duration-300"
        >
          <button 
            onClick={() => onDismiss(inv.id)}
            className="absolute top-3 right-3 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-inner">
              {getUserNameFromId(inv.from)?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="flex-1">
              <h3 className="text-white font-semibold text-lg leading-tight">
                {getUserNameFromId(inv.from)}
              </h3>
              <p className="text-slate-300 text-sm animate-pulse">Incoming call...</p>
            </div>
          </div>
          <div className="flex gap-3 mt-1">
            <button
              onClick={() => onDecline(inv.id)}
              className="flex-1 flex items-center justify-center space-x-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all duration-200 py-2.5 rounded-xl font-medium active:scale-95"
            >
              <PhoneOff className="w-4 h-4" />
              <span>Decline</span>
            </button>
            <button
              onClick={() => onAccept(inv.id)}
              className="flex-1 flex items-center justify-center space-x-2 bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/30 transition-all duration-200 py-2.5 rounded-xl font-medium active:scale-95"
            >
              <Phone className="w-4 h-4 fill-current" />
              <span>Accept</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

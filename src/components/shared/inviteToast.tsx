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

export default function InvitationToasts() {
  const socket = useSocket();
  const { invitations } = useSelector((state: RootState) => state.miscSlice);
  const { usersInRoom, currentUser } = useSelector(
    (state: RootState) => state.roomState
  );
  const dispatch = useDispatch();

  // const onAccept = (invitationId: string) => {
  //   const [invitation] = invitations.filter((i) => i.id == invitationId);
  //   console.log(invitation, currentUser);
  //   if (!currentUser) return;
  //   socket.emit(
  //     "call:accept",
  //     {
  //       conversationId: invitation.conversationId,
  //       targetUserId: currentUser?.id,
  //       from: invitation.from,
  //     },
  //     (res: {
  //       isConversationActive: boolean;
  //       conversation: Conversation | null;
  //     }) => {
  //       const { isConversationActive, conversation } = res;
  //       if (isConversationActive) {
  //         if (conversation && conversation.conversationId) {
  //           dispatch(
  //             addConversation({
  //               conversationId: conversation?.conversationId,
  //               createdAt: conversation.createdAt,
  //               creator: conversation.creator,
  //               members: conversation.members,
  //               pending: conversation.pending,
  //               status: conversation.status,
  //             })
  //           );
  //         }
  //         console.log("[accept]:subscribing...........");
  //         liveKitManager.toggleVideo(true);
  //         liveKitManager.toggleAudio(true);
  //         liveKitManager.syncSubscriptions(
  //           conversation?.members.filter((m) => m != currentUser.id) ?? [],
  //           []
  //         );
  //         console.log("[accept]:subscribed.......");

  //         dispatch(openCallScreen());
  //       }

  //       console.log("invitation expired");
  //     }
  //   );

  //   dispatch(removeInvitation(invitation.id));
  // };
  
  
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
    <div className="fixed bottom-4 right-4 space-y-2 z-60">
      {invitations
        // .filter((inv) => inv.status === "pending")
        .map((inv) => (
          <div
            key={inv.id}
            className="bg-white shadow-lg rounded-lg p-4 w-72 flex flex-col"
          >
            <p className="font-medium">
              {getUserNameFromId(inv.from)} invites you to chat
            </p>
            <div className="mt-2 flex gap-2">
              <button
                className="bg-green-500 text-white px-3 py-1 rounded"
                onClick={() => onAccept(inv.id)}
              >
                Accept
              </button>
              <button
                className="bg-red-500 text-white px-3 py-1 rounded"
                onClick={() => onDecline(inv.id)}
              >
                Decline
              </button>
            </div>
          </div>
        ))}
    </div>
  );
}

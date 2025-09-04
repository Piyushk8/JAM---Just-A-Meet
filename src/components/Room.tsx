import { useState, useEffect } from "react";
import "../App.css";
import type {
  ConversationUpdatePayload,
  JoinRoomResponse,
  RoomSyncPayload,
  User,
} from "../types/types";
import { liveKitManager } from "../LiveKit/liveKitManager";
import {
  addUserInRoom,
  removeFromUsersInRoom,
  setCurrentUser,
  setIsAudioEnabled,
  setIsVideoEnabled,
  updateNearbyParticipants,
  updateUsersInRoom,
} from "../Redux/roomState";
import Canvas from "../Canvas/Canvas";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../Redux";
import { useSocket } from "../SocketProvider";
import UserControls from "./roomComponents/userControls";
import UserControlButton from "./roomComponents/userControlButton";
import NearbyUsers from "./NearbyUserList/NearbyUserList";
import { fetchLiveKitToken } from "@/LiveKit/helper";
import { LIVEKIT_URL } from "@/lib/consts";
import { useParams } from "react-router-dom";
import { addInvitation } from "@/Redux/misc";
import InvitationToasts from "./shared/inviteToast";
import { v4 as UUID } from "uuid";
import CallScreen from "./Conversation/ConversationScreen";
import ChatPanel from "./ChatPanel";
import RoomMediaBar from "./TopMediaBar/RoomMedia";

// const ROOM_WIDTH = 1200;
// const ROOM_HEIGHT = 800;

export default function PhaserRoom() {
  const socket = useSocket();
  const dispatch = useDispatch();
  const params = useParams();
  const [isConnecting, setIsConnecting] = useState(false);
  const { currentUser } = useSelector((state: RootState) => state.roomState);
  const { isUserControlsOpen, OnGoingConversations } = useSelector(
    (state: RootState) => state.miscSlice
  );

  // live kit connection
  useEffect(() => {
    console.log(params, currentUser);
    if (currentUser?.id && params.roomId) {
      handleConnectToLiveKitRoom();
    }

    return () => {
      liveKitManager.cleanup();
    };
  }, [params.roomId, currentUser?.id]);

  // socket handlers set up
  useEffect(() => {
    const handleConnect = () => {
      console.log("Connected to server with socket ID:", socket.id);
    };
    const handleUserJoined = (user: User) => {
      if (user.id !== socket.id) {
        dispatch(addUserInRoom({ userId: user.id, user }));
      }
    };
    const handleUserLeft = (userId: string) => {
      dispatch(removeFromUsersInRoom(userId));
      dispatch(updateNearbyParticipants({ left: [userId], joined: null }));
    };
    const handleRoomSync = (payload: RoomSyncPayload) => {
      const { me, players, proximity, audio } = payload;
      // dispatch(updateCurrentUser(me));
      dispatch(updateUsersInRoom(players));
      dispatch(
        updateNearbyParticipants({
          left: proximity.left,
          joined: proximity.entered,
        })
      );

      liveKitManager?.syncSubscriptions(proximity.entered, proximity.left);
    };

    const handleUserMediaStateChanged = ({
      userId,
      isAudioEnabled,
      isVideoEnabled,
    }: {
      userId: string;
      isAudioEnabled: boolean;
      isVideoEnabled: boolean;
    }) => {
      dispatch(
        updateUsersInRoom([
          {
            id: userId,
            isAudioEnabled,
            isVideoEnabled,
          },
        ])
      );
    };
    const handleIncomingInvite = ({
      conversationId,
      from,
      members,
    }: {
      conversationId: string;
      from: string;
      members: string[];
    }) => {
      dispatch(addInvitation({ from, members, conversationId, id: UUID() }));
    };
    const handleConversationUpdated = ({
      conversationId,
      left,
      joined,
    }: ConversationUpdatePayload) => {
      console.log(
        "syncing for making a connection:",
        conversationId
        // isAudioEnabled?
      );
      if (!conversationId) return;
      console.log("conversation updating");
      // dispatch(addUserInConversation(joined))
      // dispatch(removeFromConversation(left))
      // liveKitManager.syncSubscriptions([joined], [left]);
      console.log("conversation updated");
    };
    socket.on("connect", handleConnect);
    socket.on("user-joined", handleUserJoined);
    socket.on("user-left", handleUserLeft);
    socket.on("room-sync", handleRoomSync);
    socket.on("user-media-state-changed", handleUserMediaStateChanged);
    socket.on("incoming-invite", handleIncomingInvite);
    socket.on("conversation-updated", handleConversationUpdated);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("user-joined", handleUserJoined);
      socket.off("user-left", handleUserLeft);
      socket.off("room-sync", handleRoomSync);
      socket.off("user-media-state-changed", handleUserMediaStateChanged);
      socket.off("conversation-updated", handleConversationUpdated);
      socket.off("incoming-invite", handleIncomingInvite);
      liveKitManager?.cleanup();
    };
  }, [socket, dispatch, liveKitManager]);

  // join room effect
  useEffect(() => {
    if (!socket) return;

    const { roomId } = params;

    socket.emit(
      "join-room",
      {
        roomId,
      },
      (res: { success: boolean; data: JoinRoomResponse }) => {
        if (!res || !res.success || !socket.id) {
          console.error("Failed to join room");
          return;
        }

        const { user, room } = res.data;

        dispatch(
          setCurrentUser({
            id: user.userId,
            username: user.userName,
            x: 22,
            y: 10,
            socketId: socket?.id,
            roomId: room.roomId,
            isAudioEnabled: false,
            isVideoEnabled: false,
            sprite: user.sprite ?? "alex",
            availability: user.availability,
          })
        );
      }
    );
  }, [socket, params.roomId]);

  const handleConnectToLiveKitRoom = async () => {
    console.log(currentUser?.id, params, isConnecting);
    if (!currentUser?.id || !params.roomId || isConnecting) return;
    if (liveKitManager.room?.state == "connected") return;
    try {
      setIsConnecting(true);
      console.log("Connecting to LiveKit room...");

      const token = await fetchLiveKitToken(currentUser?.id, params.roomId);

      const room = await liveKitManager.join({
        url: LIVEKIT_URL,
        token,
        enableAudio: false,
        enableVideo: false,
      });

      // Update Redux state to reflect initial state
      dispatch(setIsAudioEnabled(false));
      dispatch(setIsVideoEnabled(false));

      console.log("Successfully connected to LiveKit room");
    } catch (error) {
      console.error("Failed to connect to LiveKit room:", error);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="relative z-0">
      {/* Map Canvas (Handles Players, Map, Proximity, etc.) */}
      <Canvas />
      <NearbyUsers />
      <RoomMediaBar position="top" showControls />
      <ChatPanel />
      <InvitationToasts />
      {OnGoingConversations && <CallScreen />}
      {isUserControlsOpen ? <UserControls /> : <UserControlButton />}
    </div>
  );
}

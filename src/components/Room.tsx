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
  setRoomTheme,
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
import { useParams, useSearchParams } from "react-router-dom";
import {
  addInvitation,
  addUserInConversation,
  removeFromConversation,
} from "@/Redux/misc";
import InvitationToasts from "./shared/inviteToast";
import { v4 as UUID } from "uuid";
import CallScreen from "./Conversation/ConversationScreen";
import ChatPanel from "./ChatPanel";
import RoomMediaBar from "./TopMediaBar/RoomMedia";
import InviteToRoom from "./roomComponents/InviteToRoom";
import RoomHeader from "./roomComponents/RoomHeader";
import { RoomThemesId, RoomThemesName } from "@/types/roomTypes";

// const ROOM_WIDTH = 1200;
// const ROOM_HEIGHT = 800;

export default function PhaserRoom() {
  const [searchParams] = useSearchParams();
  const themeFromUrlRaw = searchParams.get("th"); 

  const socket = useSocket();
  const dispatch = useDispatch();
  const params = useParams();
  const { roomId } = params;
  const [isConnecting, setIsConnecting] = useState(false);
  const { currentUser, roomTheme } = useSelector(
    (state: RootState) => state.roomState
  );
  const { isUserControlsOpen, OnGoingConversations } = useSelector(
    (state: RootState) => state.miscSlice
  );

  const themeFromUrl: RoomThemesId | undefined = (() => {
    if (!themeFromUrlRaw) return undefined;

    const parsed = Number(themeFromUrlRaw);
    return Object.values(RoomThemesId).includes(parsed as RoomThemesId)
      ? (parsed as RoomThemesId)
      : undefined;
  })();

  useEffect(() => {
    if (!roomTheme && themeFromUrl) {
      dispatch(setRoomTheme(RoomThemesName[themeFromUrl]));
    }
  }, [roomTheme, themeFromUrl, dispatch]);

  // live kit connection
  useEffect(() => {
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
      // console.log("Connected to server with socket ID:", socket.id);
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
      const { players, proximity } = payload;
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
      if (!conversationId) return;
      dispatch(addUserInConversation(joined));
      dispatch(removeFromConversation(left));
      liveKitManager.syncSubscriptions([joined], [left]);
    };
    const handleRoomUsers = (roomUsers: User[]) => {
      dispatch(updateUsersInRoom(roomUsers));
    };

    socket.on("room-users", handleRoomUsers);
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
      socket.off("room-users", handleRoomUsers);
      liveKitManager?.cleanup();
    };
  }, [socket, dispatch, liveKitManager]);

  if (!roomId) {
    return <>no room found</>;
  }

  // join room effect
  useEffect(() => {
    if (!socket) return;
    const tryReconnect = () => {
      if (!currentUser && roomId) {
        socket.emit(
          "reconnect:room",
          { roomId },
          (res: { success: boolean; data: JoinRoomResponse }) => {
            if (!res || !res.success) {
              // console.error("Failed to join room");
              return;
            }

            const { user, room } = res.data;
            dispatch(
              setCurrentUser({
                id: user.userId,
                username: user.userName,
                x: 22,
                y: 10,
                socketId: socket.id!,
                roomId: room.roomId,
                isAudioEnabled: false,
                isVideoEnabled: false,
                sprite: user.sprite,
                availability: user.availability,
              })
            );
          }
        );
      }
    };

    // Attach listener for future connects
    socket.on("connect", tryReconnect);

    // Handle case where socket is already connected
    if (socket.connected) {
      tryReconnect();
    }

    return () => {
      socket.off("connect", tryReconnect);
    };
  }, [socket, currentUser, roomId]);

  const handleConnectToLiveKitRoom = async () => {
    if (!currentUser?.id || !params.roomId || isConnecting) return;
    if (liveKitManager.room?.state == "connected") return;
    try {
      setIsConnecting(true);

      const token = await fetchLiveKitToken(currentUser?.id, params.roomId);

      await liveKitManager.join({
        url: LIVEKIT_URL,
        token,
        enableAudio: false,
        enableVideo: false,
      });

      // Update Redux state to reflect initial state
      dispatch(setIsAudioEnabled(false));
      dispatch(setIsVideoEnabled(false));
    } catch (error) {
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="relative z-0">
      {/* Map Canvas (Handles Players, Map, Proximity, etc.) */}

      <RoomHeader />
      <Canvas />
      <NearbyUsers />
      <RoomMediaBar position="top" showControls />
      <ChatPanel />
      <InvitationToasts />
      {OnGoingConversations && <CallScreen />}
    </div>
  );
}

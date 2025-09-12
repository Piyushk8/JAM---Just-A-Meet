import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { User, UserAvailabilityStatus } from "../types/types";
import type { RoomThemes } from "@/Pages/JoinRoom";

interface RoomState {
  currentUser: User | null;
  nearbyParticipants: string[];
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  roomId: string | null;
  usersInRoom: Record<string, User>;
  roomTheme: RoomThemes | null;
}

const initialState: RoomState = {
  currentUser: null,
  roomTheme: null,
  nearbyParticipants: [],
  isAudioEnabled: false,
  isVideoEnabled: false,
  roomId: null,
  usersInRoom: {},
};

const livekitSlice = createSlice({
  name: "livekit",
  initialState,
  reducers: {
    setCurrentUser: (state, action: PayloadAction<User>) => {
      state.currentUser = action.payload;
    },
    updateCurrentUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.currentUser) {
        Object.assign(state.currentUser, action.payload);
      }
    },
    setRoomId: (state, action: PayloadAction<string>) => {
      if (state.currentUser) {
        state.currentUser.roomId = action.payload;
        state.roomId = action.payload;
      }
    },
    setNearbyParticipants: (state, action: PayloadAction<string[]>) => {
      state.nearbyParticipants = action.payload;
    },
    updateNearbyParticipants: (
      state,
      action: PayloadAction<{ left: string[] | null; joined: string[] | null }>
    ) => {
      const { left, joined } = action.payload;
      const currentSet = new Set(state.nearbyParticipants);

      if (left) {
        for (const id of left) {
          currentSet.delete(id);
        }
      }

      if (joined) {
        for (const id of joined) {
          currentSet.add(id);
        }
      }

      state.nearbyParticipants = Array.from(currentSet);
    },
    updateUsersInRoom: (state, action: PayloadAction<Partial<User>[]>) => {
      for (const player of action.payload) {
        if (!player.id) continue;

        const existing = state.usersInRoom[player.id];

        if (
          existing &&
          Object.keys(player).every(
            (key) => (existing as any)[key] === (player as any)[key]
          )
        ) {
          continue;
        }

        state.usersInRoom[player.id] = {
          ...existing,
          ...player,
        };
      }
    },
    removeFromUsersInRoom: (state, action: PayloadAction<string>) => {
      delete state.usersInRoom[action.payload];
    },
    addUserInRoom: (
      state,
      action: PayloadAction<{ userId: string; user: User }>
    ) => {
      const { userId, user } = action.payload;
      if (!userId || !user) return;
      state.usersInRoom[userId] = user;
    },
    setIsAudioEnabled: (state, action: PayloadAction<boolean>) => {
      state.isAudioEnabled = action.payload;
    },
    setIsVideoEnabled: (state, action: PayloadAction<boolean>) => {
      state.isVideoEnabled = action.payload;
    },
    setAvailability: (state, action: PayloadAction<UserAvailabilityStatus>) => {
      if (state.currentUser) {
        state.currentUser = {
          ...state.currentUser,
          availability: action.payload,
        };
      }
    },

    setRoomTheme: (state, action: PayloadAction<RoomThemes>) => {
      state.roomTheme = action.payload;
    },
    clearRoomTheme: (state, _action) => {
      state.roomTheme = null;
    },
  },
});

export const {
  addUserInRoom,
  setRoomTheme,
  clearRoomTheme,
  setAvailability,
  removeFromUsersInRoom,
  setCurrentUser,
  updateCurrentUser,
  setNearbyParticipants,
  setIsAudioEnabled,
  setIsVideoEnabled,
  setRoomId,
  updateUsersInRoom,
  updateNearbyParticipants,
} = livekitSlice.actions;

export default livekitSlice.reducer;

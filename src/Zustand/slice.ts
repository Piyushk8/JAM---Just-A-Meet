import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { User } from "../types/types";

interface roomState {
  currentUser: User | null;
  nearbyParticipants: string[] | null;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
}

const initialState: roomState = {
  currentUser: null,
  nearbyParticipants: [],
  isAudioEnabled: false,
  isVideoEnabled: false,
};

const livekitSlice = createSlice({
  name: "livekit",
  initialState,
  reducers: {
    setCurrentUser: (state, action: PayloadAction<any>) => {
      state.currentUser = {
        ...state.currentUser,
        ...(action.payload ?? null),
      };
    },
    setNearbyParticipants: (state, action: PayloadAction<string[]>) => {
      state.nearbyParticipants = action.payload;
    },

    setIsAudioEnabled: (state, action) => {
      state.isAudioEnabled = action.payload;
    },
    setIsVideoEnabled: (state, action) => {
      state.isAudioEnabled = action.payload;
    },
  },
});

export const {
  setCurrentUser,
  setNearbyParticipants,
  setIsAudioEnabled,
  setIsVideoEnabled,
} = livekitSlice.actions;
export default livekitSlice.reducer;

// import { createSlice } from "@reduxjs/toolkit";
// import type { PayloadAction } from "@reduxjs/toolkit";
// import type { User } from "../types/types";
// import {enableMapSet} from "immer"
// enableMapSet()
// interface roomState {
//   currentUser: User | null;
//   nearbyParticipants: Set<string>;
//   isAudioEnabled: boolean;
//   isVideoEnabled: boolean;
//   roomId: string | null;
//   usersInRoom: Map<string, User>;
// }

// const initialState: roomState = {
//   currentUser:null,
//   nearbyParticipants: new Set(),
//   isAudioEnabled: false,
//   isVideoEnabled: false,
//   roomId: null,
//   usersInRoom: new Map([
//     [
//       "user1",
//       {
//         id: "user1",
//         username: "piyush",
//         x: 0,
//         y: 0,
//         socketId: "",
//         roomId: "room1",
//         sprite: "",
//       },
//     ],
//     [
//       "user2",
//       {
//         id: "user2",
//         username: "alex",
//         x: 5,
//         y: 5,
//         socketId: "",
//         roomId: "room1",
//         sprite: "",
//       },
//     ],
//   ]),
// };

// const livekitSlice = createSlice({
//   name: "livekit",
//   initialState,
//   reducers: {
//     setCurrentUser: (state, action: PayloadAction<User>) => {
//       state.currentUser = action.payload;
//     },
//     updateCurrentUser: (state, action: PayloadAction<Partial<User>>) => {
//       if (!state.currentUser) return;
//       else {
//         Object.assign(state.currentUser, action.payload);
//       }
//     },
//     setRoomId: (state, action: PayloadAction<string>) => {
//       if (!state.currentUser) return;
//       Object.assign(state.currentUser, action.payload);
//     },
//     setNearbyParticipants: (state, action) => {
//       state.nearbyParticipants = action.payload;
//     },
//     updateNearbyParticipants: (
//       state,
//       action: PayloadAction<{ left: string[] | null; joined: string[] | null }>
//     ) => {
//       const { left, joined } = action.payload;

//       if (left) {
//         for (const id of new Set(left)) {
//           state.nearbyParticipants.delete(id);
//         }
//       }

//       if (joined) {
//         for (const id of new Set(joined)) {
//           state.nearbyParticipants.add(id);
//         }
//       }
//     },
//     updateUsersInRoom: (state, action: PayloadAction<Partial<User>[]>) => {
//       for (const player of action.payload) {
//         if (!player.id) continue;
//         const existing = state.usersInRoom.get(player.id);
//         if (!existing) continue;
//         state.usersInRoom.set(player.id, { ...existing, ...player });
//       }
//     },
//     removeFromUsersInRoom: (state, action: PayloadAction<string>) => {
//       state.usersInRoom.delete(action.payload);
//     },
//     addUserInRoom: (
//       state,
//       action: PayloadAction<{ userId: string; user: User }>
//     ) => {
//       const { user, userId } = action.payload;
//       if (!userId || !user) return;
//       state.usersInRoom.set(userId, user);
//     },
//     setIsAudioEnabled: (state, action) => {
//       state.isAudioEnabled = action.payload;
//     },
//     setIsVideoEnabled: (state, action) => {
//       state.isAudioEnabled = action.payload;
//     },
//   },
// });

// export const {
//   addUserInRoom,
//   removeFromUsersInRoom,
//   setCurrentUser,
//   updateCurrentUser,
//   setNearbyParticipants,
//   setIsAudioEnabled,
//   setIsVideoEnabled,
//   setRoomId,
//   updateUsersInRoom,
//   updateNearbyParticipants,
// } = livekitSlice.actions;
// export default livekitSlice.reducer;

import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { User } from "../types/types";

interface RoomState {
  currentUser: User | null;
  nearbyParticipants: string[];
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  roomId: string | null;
  usersInRoom: Record<string, User>;
}

const initialState: RoomState = {
  currentUser: null,
  nearbyParticipants: [],
  isAudioEnabled: false,
  isVideoEnabled: false,
  roomId: null,
  usersInRoom: {
    // user1: {
    //   id: "user1",
    //   username: "piyush",
    //   x: 0,
    //   y: 0,
    //   socketId: "",
    //   roomId: "room1",
    //   sprite: "",
    // },
    // user2: {
    //   id: "user2",
    //   username: "alex",
    //   x: 5,
    //   y: 5,
    //   socketId: "",
    //   roomId: "room1",
    //   sprite: "",
    // },
  },
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
  },
});

export const {
  addUserInRoom,
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

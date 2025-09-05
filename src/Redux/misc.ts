import type { Conversation, Identity } from "@/types/types";
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface Invitation {
  from: string;
  // status:"accepted"|"failed"|"closed"|"ready"
  conversationId: string;
  members: string[];
  id: string;
}

interface MiscStates {
  isWhiteBoardOpen: boolean;
  isVendingMachineOpen: boolean;
  isComputer: boolean;

  isCallScreenOpen: boolean;
  // isWhiteBoardOpen:false,
  isUserControlsOpen: boolean;
  isleftSideBarOpen: boolean;
  invitations: Invitation[];
  OnGoingConversations: Conversation | null;
}
const initialState: MiscStates = {
  isWhiteBoardOpen: false,
  isVendingMachineOpen: false,
  isComputer: false,
  isCallScreenOpen: false,
  isUserControlsOpen: false,
  isleftSideBarOpen: false,
  invitations: [],
  OnGoingConversations: null,
};

const miscSlice = createSlice({
  initialState,
  name: "miscSlice",
  reducers: {
    openWhiteBoard: (state) => {
      state.isWhiteBoardOpen = true;
    },
    openCallScreen: (state) => {
      state.isCallScreenOpen = true;
    },
    closeCallScreen: (state) => {
      state.isCallScreenOpen = false;
    },
    openComputer: (state) => {
      state.isComputer = true;
    },
    openVendingMachine: (state) => {
      state.isVendingMachineOpen = true;
    },
    closeWhiteBoard: (state) => {
      state.isWhiteBoardOpen = false;
    },
    closeComputer: (state) => {
      state.isComputer = false;
    },
    closeVendingMachine: (state) => {
      state.isVendingMachineOpen = false;
    },
    openUserControls: (state) => {
      state.isUserControlsOpen = true;
    },
    openLeftSideBar: (state) => {
      state.isleftSideBarOpen = true;
    },
    closeLeftSideBar: (state) => {
      state.isleftSideBarOpen = false;
    },
    closeUserControls: (state) => {
      state.isUserControlsOpen = false;
    },
    addInvitation: (state, action: PayloadAction<Invitation>) => {
      state.invitations.push(action.payload);
    },
    removeInvitation: (state, action: PayloadAction<string>) => {
      state.invitations = state.invitations.filter(
        (i) => i.id != action.payload
      );
    },
    clearInvitations: (state, _action: PayloadAction<string>) => {
      state.invitations = [];
    },
    addConversation: (state, action: PayloadAction<Conversation>) => {
      state.OnGoingConversations = action.payload;
    },
    addUserInConversation: (state, action: PayloadAction<Identity>) => {
      state.OnGoingConversations?.members.push(action.payload);
    },
    removeFromConversation: (state, action: PayloadAction<Identity>) => {
      state.OnGoingConversations?.members.filter((m) => m != action.payload);
    },
    pendingToMemberInConversation: (_state, action: PayloadAction<Identity>) => {
      addUserInConversation(action.payload);
      removeFromConversation(action.payload);
    },
    deleteConversation: (state, _action: PayloadAction<string>) => {
      state.OnGoingConversations = null;
    },
  },
});

export const {
  pendingToMemberInConversation,
  removeInvitation,
  openCallScreen,
  closeCallScreen,
  removeFromConversation,
  addConversation,
  addUserInConversation,
  addInvitation,
  clearInvitations,
  deleteConversation,
  openUserControls,
  openLeftSideBar,
  closeLeftSideBar,
  closeUserControls,
  openComputer,
  openVendingMachine,
  openWhiteBoard,
  closeComputer,
  closeVendingMachine,
  closeWhiteBoard,
} = miscSlice.actions;

export default miscSlice.reducer;

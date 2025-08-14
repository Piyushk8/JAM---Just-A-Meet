import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  isWhiteBoardOpen: false,
  isVendingMachineOpen: false,
  isComputer: false,
  // isWhiteBoardOpen:false,
  isUserControlsOpen: false,
  isleftSideBarOpen: false,
};

const miscSlice = createSlice({
  initialState,
  name: "miscSlice",
  reducers: {
    openWhiteBoard: (state) => {
      state.isWhiteBoardOpen = true;
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
  },
});

export const {
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

import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  isWhiteBoardOpen: false,
  isVendingMachineOpen: false,
  isComputer: false,
  // isWhiteBoardOpen:false,
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
    open: () => {},
  },
});

export const {
  openComputer,
  openVendingMachine,
  openWhiteBoard,
  closeComputer,
  closeVendingMachine,
  closeWhiteBoard,
} = miscSlice.actions;

export default miscSlice.reducer;

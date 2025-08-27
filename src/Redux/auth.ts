import type { UserInfo } from "@/types/types";
import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

const initialState: { userInfo: null | UserInfo } = {
  userInfo: null,
};

const authSlice = createSlice({
  name: "authSlice",
  initialState,
  reducers: {
    setUserInfo: (state, action: PayloadAction<UserInfo>) => {
      state.userInfo = action.payload;
    },
    updateUserInfo: (state, action: PayloadAction<Partial<UserInfo>>) => {
      if (state.userInfo) {
        Object.assign(state.userInfo, action.payload);
      } else {
        state.userInfo = { ...action.payload } as UserInfo;
      }
    },
  },
});

export const { setUserInfo, updateUserInfo } = authSlice.actions;

export default authSlice.reducer;

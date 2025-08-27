import { SERVER_URL } from "@/lib/consts";
import type { UserInfo } from "@/types/types";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

const initialState: { userInfo: null | UserInfo; loading: boolean } = {
  userInfo: null,
  loading: true,
};

export const fetchCurrentUser = createAsyncThunk("auth/fetchUser", async () => {
  const res = await fetch(`${SERVER_URL}/api/v1/user/me`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Not authenticated");
  const { data } = await res.json();
  return data; 
});

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
  extraReducers: (builder) => {
    builder
      .addCase(fetchCurrentUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.userInfo = action.payload;
        state.loading = false;
      })
      .addCase(fetchCurrentUser.rejected, (state) => {
        state.userInfo = null;
        state.loading = false;
      });
  },
});

export const { setUserInfo, updateUserInfo } = authSlice.actions;

export default authSlice.reducer;

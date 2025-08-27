import { configureStore } from "@reduxjs/toolkit";
import livekitReducer from "./roomState";
import interactionStateReducer from "./interactionState";
import miscSliceReducer from "./misc";
import authSlice from "./auth";
export const store = configureStore({
  reducer: {
    roomState: livekitReducer,
    interactionState: interactionStateReducer,
    miscSlice: miscSliceReducer,
    authSlice: authSlice,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

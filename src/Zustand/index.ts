import { configureStore } from '@reduxjs/toolkit';
import livekitReducer from './slice';

export const store = configureStore({
  reducer: {
    roomState: livekitReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

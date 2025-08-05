import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { InteractableObject } from "../Interactables/coreDS";
import {
  serializeInteractable,
  type serializedInteractableType,
} from "../lib/helper";

interface InteractionState {
  availableInteractions: serializedInteractableType[] | null;
  closestInteraction: serializedInteractableType | null;
}

const initialState: InteractionState = {
  availableInteractions: null,
  closestInteraction: null,
};

const interactionState = createSlice({
  name: "interactionStates",
  initialState,
  reducers: {
    setAvailableInteractions: (
      state,
      action: PayloadAction<serializedInteractableType[] | null>
    ) => {
      if (action.payload) {
        state.availableInteractions = action.payload;
      }
    },
    setClosestInteraction: (
      state,
      action: PayloadAction<serializedInteractableType | null>
    ) => {
      if (action.payload) {
        state.closestInteraction = action.payload;
      }
    },
  },
});

export const { setAvailableInteractions, setClosestInteraction } =
  interactionState.actions;

export default interactionState.reducer;

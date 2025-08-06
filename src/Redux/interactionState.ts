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

// interactions defines all the objects we can interact with and want to show respective interactions response for each 
// ex- computer on closest if 'triggered' - calls its callbackhandler and opens video call

const interactionState = createSlice({
  name: "interactionStates",
  initialState,
  reducers: {
    setAvailableInteractions: (
      state,
      action: PayloadAction<serializedInteractableType[] | null>
    ) => {
      console.log("here seeting the available",action.payload)
      if (action.payload) {
        state.availableInteractions = action.payload;
      }
    },
    setClosestInteraction: (
      state,
      action: PayloadAction<serializedInteractableType | null>
    ) => {
      console.log("here seeting the closest",action.payload)
      state.closestInteraction = action.payload;
    },
  },
});

export const { setAvailableInteractions, setClosestInteraction } =
  interactionState.actions;

export default interactionState.reducer;

import { useDispatch, useSelector } from "react-redux";
import type { InteractionEvent } from "../../Interactables/manager";
import type { RootState } from "../../Redux";
import {
  openComputer,
  openVendingMachine,
  openWhiteBoard,
} from "../../Redux/misc";
import { useCallback } from "react";

//  type: 'available' | 'lost' | 'triggered';
//   objectId: string;
//   object?: InteractableObject;
//   position?: { x: number; y: number };
export const useInteractionHandler = () => {
  const { closestInteraction } = useSelector(
    (state: RootState) => state.interactionState
  );
  const dispatch = useDispatch();

  const handler = useCallback(
    (event: InteractionEvent) => {
      if (event.type === "triggered") {
        const interactionType = closestInteraction?.type ?? event.object?.type;

        switch (interactionType) {
          case "computer":
            dispatch(openComputer());
            break;
          case "vendingmachine":
            dispatch(openVendingMachine());
            break;
          case "whiteboard":
            dispatch(openWhiteBoard());
            break;
        }
      }
    },
    [dispatch, closestInteraction] // still depends on Redux state
  );

  return handler;
};

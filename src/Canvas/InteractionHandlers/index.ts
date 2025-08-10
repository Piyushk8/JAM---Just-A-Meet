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
  const { availableInteractions, closestInteraction } = useSelector(
    (state: RootState) => state.interactionState
  );
  const dispatch = useDispatch();

  const computerHandler = () => {
    dispatch(openComputer());
  };
  const vendingmachineHandler = () => {
    dispatch(openVendingMachine());
  };
  const whiteBoardHandler = () => {
    dispatch(openWhiteBoard());
  };

  const handler = useCallback(
    (event: InteractionEvent) => {
      if (event.type === "triggered" && closestInteraction) {
        switch (closestInteraction.type) {
          case "computer":
            computerHandler();
            break;
          case "vendingmachine":
            vendingmachineHandler();
            break;
          case "whiteboard":
            whiteBoardHandler();
            break;
        }
      }
    },
    [closestInteraction]
  );
  return handler;
};

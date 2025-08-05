import { useDispatch, useSelector } from "react-redux";
import type { InteractionEvent } from "../../Interactables/manager";
import type { RootState } from "../../Redux";
import {
  openComputer,
  openVendingMachine,
  openWhiteBoard,
} from "../../Redux/misc";

//  type: 'available' | 'lost' | 'triggered';
//   objectId: string;
//   object?: InteractableObject;
//   position?: { x: number; y: number };

export const onInteractionHandler = (event: InteractionEvent) => {
  const { position, objectId, object, type } = event;
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
  console.log("interactionhandlers",closestInteraction, availableInteractions)

  if (type === "triggered") {
    if (position && closestInteraction) {
      switch (closestInteraction.type) {
        case "computer":
          computerHandler();
        case "vendingmachine":
          vendingmachineHandler();
        case "whiteboard":
          whiteBoardHandler();
      }
    }
  } else {
    return;
  }
};

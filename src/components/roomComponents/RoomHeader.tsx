import type { RootState } from "@/Redux";
import React from "react";
import { useSelector } from "react-redux";
import UserControls from "./userControls";
import UserControlButton from "./userControlButton";
import InviteToRoom from "./InviteToRoom";

const RoomHeader = () => {
  const { isUserControlsOpen } = useSelector(
    (state: RootState) => state.miscSlice
  );

  return (
    <div className="absolute z-30 top-5 right-5 flex items-start gap-3">
      <div className="flex items-center gap-3 p-2 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-lg">
        <InviteToRoom />
        {isUserControlsOpen ? <UserControls /> : <UserControlButton />}
      </div>
    </div>
  );
};

export default RoomHeader;

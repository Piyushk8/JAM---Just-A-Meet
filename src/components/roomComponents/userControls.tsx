import React from "react";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../../Redux";
import { closeUserControls } from "@/Redux/misc";
import { useState } from "react";
import {
  LogOut,
  Video,
  Mic,
  User,
  LogOutIcon,
  Settings2,
  Settings,
} from "lucide-react";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import { setAvailability } from "@/Redux/roomState";
import { Avatar } from "@radix-ui/react-avatar";
import { AvatarFallback, AvatarImage } from "../ui/avatar";
import { Separator } from "../ui/separator";
import { useSocket } from "@/SocketProvider";

const UserControls = () => {
  const dispatch = useDispatch();
  const socket = useSocket();
  // user, onStatusChange, onLeaveRoom, onSignOut, onToggleMic, onToggleCam
  const { currentUser: user } = useSelector(
    (state: RootState) => state.roomState
  );

  const {} = useSelector((state: RootState) => state.miscSlice);
  const onClickHandler = () => {
    dispatch(closeUserControls());
  };
  const handleToggleAvailability = (checked: boolean) => {
    dispatch(setAvailability(checked ? "away" : "idle"));
    socket.emit("userStatusChange", { status: checked ? "away" : "idle" });
  };
  const statuses = [
    { label: "Available", value: "idle", color: "bg-green-500" },
    { label: "Busy", value: "busy", color: "bg-red-500" },
    { label: "Away", value: "away", color: "bg-yellow-500" },
  ];
  return (
    <div className="absolute z-30 top-5 right-5">
      <button
        onClick={onClickHandler}
        className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-800 hover:bg-gray-700"
      >
        <div className="h-10 w-10 rounded-full">
          <Avatar className="">
            <AvatarImage
              src="https://github.com/shadcn.png"
              className="h-10 w-10 rounded-full"
            />
            <AvatarFallback>CN</AvatarFallback>
          </Avatar>
        </div>
        <span
          className={`w-3 h-3 rounded-full ${
            statuses.find((s) => s.value === user?.availability)?.color
          }`}
        />
      </button>

      <div className="absolute p-4 right-0 mt-2 w-48 rounded-lg shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
        <div className="flex items-center space-x-2 px-2">
          <Label htmlFor="idle-away-switch" className="text-sm">
            {user?.availability === "away" ? "Away" : "Idle"}
          </Label>
          <Switch
            id="idle-away-switch"
            checked={user?.availability === "away"}
            onCheckedChange={handleToggleAvailability}
          />
        </div>
        <Separator className="my-4" />
        <div className="flex items-center justify-start gap-3">
          <LogOutIcon className="size-5" /> Logout
        </div>
        <div className="flex items-center justify-start gap-3">
          <Settings className="size-5" /> Settings
        </div>
        <Separator className="my-1" />
      </div>
    </div>
  );
};

export default UserControls;

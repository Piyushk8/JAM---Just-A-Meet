import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../../Redux";
import { closeUserControls } from "@/Redux/misc";
import { LogOutIcon, Settings } from "lucide-react";
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
  const { currentUser: user } = useSelector(
    (state: RootState) => state.roomState
  );

  const onClickHandler = () => {
    dispatch(closeUserControls());
  };

  const handleToggleAvailability = (checked: boolean) => {
    dispatch(setAvailability(checked ? "away" : "idle"));
    socket?.emit("userStatusChange", { status: checked ? "away" : "idle" });
  };

  const statuses = [
    { label: "Available", value: "idle", color: "bg-green-500" },
    { label: "Busy", value: "busy", color: "bg-red-500" },
    { label: "Away", value: "away", color: "bg-yellow-500" },
  ];

  const status = statuses.find((s) => s.value === user?.availability);
  const handleLogout = ()=>{
    
  }
  return (
    <div className="relative">
      <button
        onClick={onClickHandler}
        className="flex items-center relative gap-2 p-1 rounded-full hover:bg-white/10 transition-colors"
      >
        <div className="h-10 w-10 rounded-full">
          <Avatar>
            <AvatarImage
              src="https://github.com/shadcn.png"
              className="h-10 w-10 rounded-full"
            />
            <AvatarFallback>CN</AvatarFallback>
          </Avatar>
        </div>

        <span
          className={`w-3.5 h-3.5 absolute top-0.5 right-0.5 rounded-full ${
            status?.color || "bg-gray-500"
          } border-2 border-white shadow-sm`}
        />
      </button>

      <div className="w-52 mt-3 absolute p-4 text-sm right-0 rounded-xl shadow-xl bg-white/95 backdrop-blur-md border border-white/20 z-30">
        <div className="flex items-center justify-between px-2 mb-3">
          <Label htmlFor="idle-away-switch" className="text-sm font-medium">
            {user?.availability === "away" ? "Away" : "Available"}
          </Label>
          <Switch
            id="idle-away-switch"
            checked={user?.availability === "away"}
            onCheckedChange={handleToggleAvailability}
            className="text-sm"
          />
        </div>

        <Separator className="mb-3" />

        <button className="flex items-center justify-start gap-3 w-full p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <Settings className="size-4 text-gray-600" />
          <span className="text-gray-700">Settings</span>
        </button>

        <button className="flex items-center justify-start gap-3 w-full p-2 rounded-lg hover:bg-red-50 text-red-600 transition-colors mt-1">
          <LogOutIcon className="size-4" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default UserControls;

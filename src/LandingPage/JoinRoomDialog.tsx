import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { RootState } from "@/Redux";
import { setCurrentUser } from "@/Redux/roomState";
import { useSocket } from "@/SocketProvider";
import type { JoinRoomResponse } from "@/types/types";
import { useActionState, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

type FormState = {
  success: boolean;
  error: string;
  roomId: string;
};

export function JoinRoomDialog() {
  const socket = useSocket();
  const dispatch = useDispatch();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const { userInfo, loading } = useSelector(
    (state: RootState) => state.authSlice
  );
  useEffect(() => {
    if (!userInfo && !loading) {
      nav("/login");
    }
  }, [userInfo?.id, loading]);
  
  const handleJoinRoom = async (
    prevState: FormState,
    formData: FormData
  ): Promise<FormState> => {
    const roomId = formData.get("roomId") as string;

    // Validation
    if (!roomId?.trim()) {
      return {
        ...prevState,
        error: "Room ID is required",
        success: false,
      };
    }

    if (!socket) {
      return {
        ...prevState,
        error: "Connection error. Please refresh and try again.",
        success: false,
      };
    }

    return new Promise((resolve) => {
      socket.emit(
        "join-room",
        {
          roomId: roomId.trim(),
          sprite: "Adam",
        },
        async (res: { success: boolean; data: JoinRoomResponse }) => {
          try {
            if (!res || !res.success || !res.data) {
              resolve({
                ...prevState,
                error: "Failed to join room. Please try again.",
                success: false,
                roomId,
              });
              return;
            }

            if (!socket.id) {
              resolve({
                ...prevState,
                error: "Socket connection lost. Please refresh and try again.",
                success: false,
                roomId,
              });
              return;
            }

            const { userId, userName, availability, sprite } = res.data.user;
            const { roomId: joinedRoomId } = res.data.room;

            dispatch(
              setCurrentUser({
                id: userId,
                username: userName,
                x: 22,
                y: 10,
                socketId: socket.id,
                roomId: joinedRoomId,
                isAudioEnabled: false,
                isVideoEnabled: false,
                sprite: sprite,
                availability: availability,
              })
            );

            setOpen(false);
            nav("/lobby");

            resolve({
              ...prevState,
              error: "",
              success: true,
              roomId,
            });
          } catch (error) {
            if (error instanceof Error) {
              resolve({
                ...prevState,
                error: error.message || "In correct RoomId",
                success: false,
                roomId,
              });
            } else {
              resolve({
                ...prevState,
                error: "An unexpected error occurred. Please try again.",
                success: false,
                roomId,
              });
            }
          }
        }
      );
    });
  };

  const [state, formAction, isPending] = useActionState(handleJoinRoom, {
    success: false,
    error: "",
    roomId: "",
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <p className="cursor-pointer">Join Existing Room</p>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form action={formAction}>
          <DialogHeader>
            <DialogTitle>Enter Room ID</DialogTitle>
            <DialogDescription>
              Enter Room ID from Room Participants
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-3">
              <Label htmlFor="roomId">Room ID</Label>
              <Input
                id="roomId"
                name="roomId"
                placeholder="Enter room ID"
                defaultValue={state.roomId}
                disabled={isPending}
              />
            </div>

            {/* Error message */}
            {state.error && (
              <div className="text-red-500 text-sm">{state.error}</div>
            )}

            {/* Success message */}
            {state.success && (
              <div className="text-green-500 text-sm">
                Successfully joined room!
              </div>
            )}
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isPending}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Joining..." : "Join"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

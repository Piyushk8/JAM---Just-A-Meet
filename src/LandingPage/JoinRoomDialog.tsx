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
import { useSelector } from "react-redux";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export function JoinRoomDialog() {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [error, setError] = useState("");
  const { userInfo, loading } = useSelector(
    (state: RootState) => state.authSlice
  );

  useEffect(() => {
    if (!userInfo && !loading) {
      nav("/login");
    }
  }, [userInfo?.id, loading]);

  const handleJoin = () => {
    if (!roomId.trim()) {
      setError("Room ID is required");
      return;
    }
    nav("/lobby", { state: { from: "join", roomId: roomId.trim() } });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <p className="cursor-pointer">Join Existing Room</p>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
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
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
            />
          </div>

          {error && <div className="text-red-500 text-sm">{error}</div>}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleJoin}>
            Join
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

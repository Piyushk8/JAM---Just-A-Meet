interface User {
  id: string;
  username: string;
  x: number;
  y: number;
  distance?: number;
  isAudioEnabled?: boolean;
  isVideoEnabled?: boolean;
}
export type RoomTheme = "basicoffice" | "largeoffice";
export const ROOM_THEMES = ["basicoffice", "largeoffice"] as const;

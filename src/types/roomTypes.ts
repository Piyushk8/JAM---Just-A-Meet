interface User {
  id: string;
  username: string;
  x: number;
  y: number;
  distance?: number;
  isAudioEnabled?: boolean;
  isVideoEnabled?: boolean;
}

export type RoomThemes = "office 1" | "larger office 1" | "larger office 2";

export const RoomThemesId = {
  "office 1": 1,
  "larger office 1": 2,
  "larger office 2": 3,
} as const;

export type RoomThemesId = typeof RoomThemesId[keyof typeof RoomThemesId];

export const RoomThemesName = Object.fromEntries(
  Object.entries(RoomThemesId).map(([key, value]) => [value, key])
) as Record<RoomThemesId, keyof typeof RoomThemesId>;


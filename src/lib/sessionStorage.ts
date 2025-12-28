import type { RoomTheme } from "@/types/roomTypes";

const STORAGE_KEY = "roomSetup";

// types/roomSetup.ts
export type RoomSetupState = {
  mode?: "create" | "join";
  roomName?: string;
  roomTheme?: RoomTheme;
  roomId?: string;
  sprite?: string;
};

export const RoomSetupStorage = {
  get(): RoomSetupState {
    try {
      const data = sessionStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  },

  set(state: RoomSetupState) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  },

  update(partial: Partial<RoomSetupState>) {
    const existing = this.get();
    this.set({ ...existing, ...partial });
  },

  clear() {
    sessionStorage.removeItem(STORAGE_KEY);
  },
};

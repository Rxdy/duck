import { create } from "zustand";
import type { PlayerState } from "@duck/protocol";

interface GameStore {
  players: PlayerState[];
  setPlayers: (players: PlayerState[]) => void;
}

export const useGameStore = create<GameStore>((set) => ({
  players: [],
  setPlayers: (players) => set({ players }),
}));

import { defineStore } from "pinia";
import type { PlayerState } from "../types.js";

export const useGameStore = defineStore("game", {
  state: () => ({
    players: [] as PlayerState[],
  }),
  actions: {
    setPlayers(players: PlayerState[]) {
      this.players = players;
    },
  },
});

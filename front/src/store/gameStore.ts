import { defineStore } from "pinia";
import type { PlayerState } from "../types.js";

export interface GameMapInfo {
  width: number;
  height: number;
  tiles: string[][];
}

export const useGameStore = defineStore("game", {
  state: () => ({
    players: [] as PlayerState[],
    map: null as GameMapInfo | null,
    // Défini quand le serveur envoie END (voir useGameSocket.ts) : la partie
    // est terminée, plus aucun coup n'est accepté côté serveur.
    winnerId: null as string | null,
  }),
  actions: {
    setPlayers(players: PlayerState[]) {
      this.players = players;
    },
    setMap(map: GameMapInfo) {
      this.map = map;
    },
    setWinner(winnerId: string | null) {
      this.winnerId = winnerId;
    },
  },
});

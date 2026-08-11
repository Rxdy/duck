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
    // Défini quand le serveur refuse la demande (message ERROR) : la partie
    // n'a jamais commencé.
    error: null as string | null,
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
    setError(message: string | null) {
      this.error = message;
    },
    /**
     * Remet la salle à zéro avant de rejouer (voir composables/useGameSocket.ts
     * #restart). La carte est effacée aussi : la partie suivante peut tomber
     * sur une autre, et garder l'ancienne afficherait un plateau qui n'est
     * plus celui qu'on joue.
     */
    reset() {
      this.players = [];
      this.map = null;
      this.winnerId = null;
      this.error = null;
    },
  },
});

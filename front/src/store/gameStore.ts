import { defineStore } from "pinia";
import type { BotLevel, GameMode, PlayerState } from "../types.js";

export interface GameMapInfo {
  width: number;
  height: number;
  tiles: string[][];
}

export const useGameStore = defineStore("game", {
  state: () => ({
    players: [] as PlayerState[],
    // Ce qu'on cherche ou joue en ligne (voir lib/matchSession.ts). Nul hors file.
    queue: null as { mode: GameMode; botLevel?: BotLevel } | null,
    map: null as GameMapInfo | null,
    // Défini quand le serveur envoie END (voir useGameSocket.ts) : la partie
    // est terminée, plus aucun coup n'est accepté côté serveur.
    winnerId: null as string | null,
    // Fin du décompte de départ, sur l'horloge du navigateur. Nul tant que le
    // plateau n'est pas montré.
    playableAt: null as number | null,
    // Son propre joueur (message MAP). Inconnu en entraînement, où l'on est le premier.
    playerId: null as string | null,
    // Défini quand le serveur refuse la demande (message ERROR) : la partie
    // n'a jamais commencé.
    error: null as string | null,
    // Non nul tant que la salle réunit ses joueurs (message WAITING, voir
    // back/src/matchmaking.ts) : le serveur refuse les coups pendant ce
    // temps-là, l'interface doit le dire plutôt que de laisser croire à des
    // commandes cassées. Repasse à null au premier STATE, définitivement.
    waiting: null as { capacity: number; startsInMs: number } | null,
  }),
  actions: {
    setQueue(queue: { mode: GameMode; botLevel?: BotLevel } | null) {
      this.queue = queue;
    },
    setPlayers(players: PlayerState[]) {
      this.players = players;
    },
    setWaiting(waiting: { capacity: number; startsInMs: number } | null) {
      this.waiting = waiting;
    },
    setMap(map: GameMapInfo) {
      this.map = map;
    },
    setPlayerId(playerId: string | null) {
      this.playerId = playerId;
    },
    setPlayableAt(playableAt: number | null) {
      this.playableAt = playableAt;
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
      this.queue = null;
      this.map = null;
      this.winnerId = null;
      this.playerId = null;
      this.playableAt = null;
      this.error = null;
      this.waiting = null;
    },
  },
});

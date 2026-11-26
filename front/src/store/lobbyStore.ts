import { defineStore } from "pinia";
import type { LobbyState } from "../types.js";

/** Le salon où l'on se trouve (voir lib/matchSession.ts). Nul hors salon. */
export const useLobbyStore = defineStore("lobby", {
  state: () => ({
    lobby: null as LobbyState | null,
    /** Son propre code joueur. */
    you: "",
    /** Pourquoi on n'est pas, ou plus, dans un salon. */
    notice: "",
  }),
  getters: {
    isHost: (state) => state.lobby?.players[0]?.tag === state.you,
  },
  actions: {
    clear(notice = "") {
      this.lobby = null;
      this.you = "";
      this.notice = notice;
    },
  },
});

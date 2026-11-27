import { defineStore } from "pinia";
import type { EditorMap } from "../lib/mapEditor.js";

export const useTestSessionStore = defineStore("testSession", {
  state: () => ({
    map: null as EditorMap | null,
    /** Où revenir en quittant le test : l'éditeur, ou la galerie d'où l'on vient. */
    returnTo: "/creatif/editeur",
  }),
  actions: {
    setMap(map: EditorMap, returnTo = "/creatif/editeur") {
      this.map = map;
      this.returnTo = returnTo;
    },
    clear() {
      this.map = null;
    },
  },
});

import { defineStore } from "pinia";
import type { EditorMap } from "../lib/mapEditor.js";

export const useTestSessionStore = defineStore("testSession", {
  state: () => ({
    map: null as EditorMap | null,
  }),
  actions: {
    setMap(map: EditorMap) {
      this.map = map;
    },
    clear() {
      this.map = null;
    },
  },
});

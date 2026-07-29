import { defineStore } from "pinia";
import { BOARD_PRESETS } from "../lib/board.js";
import { createEmptyMap, type EditorMap, type Tool } from "../lib/mapEditor.js";

const DEFAULT_PRESET = BOARD_PRESETS.find((p) => p.id === "duel-m")!;

/**
 * État de l'éditeur de carte, dans un store (pas des refs locales à la page) :
 * un composant Vue est détruit quand on quitte sa route (Tester, Mes cartes...)
 * et remonté à zéro au retour — sans store, tout le travail en cours serait
 * perdu à chaque aller-retour.
 */
export const useCreativeEditorStore = defineStore("creativeEditor", {
  state: () => ({
    selectedId: DEFAULT_PRESET.id,
    tool: "spawn-0" as Tool,
    map: createEmptyMap(DEFAULT_PRESET.width, DEFAULT_PRESET.height) as EditorMap,
    mapName: "",
    currentMapId: undefined as string | undefined,
  }),
  actions: {
    /** Reset explicite (changement de taille voulu par l'utilisateur). */
    resetForSize(id: string, width: number, height: number) {
      this.selectedId = id;
      this.map = createEmptyMap(width, height);
      this.mapName = "";
      this.currentMapId = undefined;
    },
    loadMap(found: {
      id: string;
      name: string;
      width: number;
      height: number;
      tiles: EditorMap["tiles"];
    }) {
      const matchingPreset = BOARD_PRESETS.find(
        (p) => p.width === found.width && p.height === found.height,
      );
      if (matchingPreset) this.selectedId = matchingPreset.id;

      this.map = { width: found.width, height: found.height, tiles: found.tiles };
      this.mapName = found.name;
      this.currentMapId = found.id;
    },
  },
});

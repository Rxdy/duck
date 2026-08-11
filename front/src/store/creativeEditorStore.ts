import { defineStore } from "pinia";
import { BOARD_PRESETS, CUSTOM_SIZE_ID } from "../lib/board.js";
import { createEmptyMap, type EditorMap, type Tool } from "../lib/mapEditor.js";

const DEFAULT_PRESET = BOARD_PRESETS.find((p) => p.id === "duel-m")!;

/**
 * Preset correspondant à une carte, ou "custom" : les presets décrivent la
 * zone JOUABLE alors qu'une carte porte ses murs de contour (voir
 * mapEditor.ts#createEmptyMap), d'où le +2 — sans lui, aucune carte ne
 * correspondrait jamais à son propre preset et le sélecteur afficherait une
 * taille qui n'est pas celle affichée à l'écran.
 */
function sizeIdFor(width: number, height: number): string {
  const preset = BOARD_PRESETS.find((p) => p.width + 2 === width && p.height + 2 === height);
  return preset?.id ?? CUSTOM_SIZE_ID;
}

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
    /**
     * Reset explicite (changement de taille voulu par l'utilisateur).
     * `playableWidth`/`playableHeight` excluent les murs du contour.
     *
     * `selectedId` force l'entrée sélectionnée dans le sélecteur : une taille
     * libre qui tombe par hasard sur celle d'un preset doit rester "sur
     * mesure", sinon les champs de saisie disparaîtraient sous les doigts de
     * l'utilisateur en train de les remplir.
     */
    resetForSize(playableWidth: number, playableHeight: number, selectedId?: string) {
      this.map = createEmptyMap(playableWidth, playableHeight);
      this.selectedId = selectedId ?? sizeIdFor(this.map.width, this.map.height);
      this.mapName = "";
      this.currentMapId = undefined;
    },
    /** Passe en taille libre sans toucher à la carte en cours. */
    selectCustomSize() {
      this.selectedId = CUSTOM_SIZE_ID;
    },
    loadMap(found: {
      id: string;
      name: string;
      width: number;
      height: number;
      tiles: EditorMap["tiles"];
    }) {
      this.map = { width: found.width, height: found.height, tiles: found.tiles };
      this.selectedId = sizeIdFor(found.width, found.height);
      this.mapName = found.name;
      this.currentMapId = found.id;
    },
    /**
     * Remplace la carte en cours par une matrice importée (voir
     * lib/mapMatrix.ts). Détache de la carte sauvegardée en cours : une
     * matrice importée est une NOUVELLE carte, la sauvegarder ne doit pas
     * écraser celle qu'on était en train de modifier.
     */
    importMap(map: EditorMap) {
      this.map = map;
      this.selectedId = sizeIdFor(map.width, map.height);
      this.mapName = "";
      this.currentMapId = undefined;
    },
  },
});

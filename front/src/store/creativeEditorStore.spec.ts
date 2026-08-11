import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { CUSTOM_SIZE_ID } from "../lib/board.js";
import { createEmptyMap } from "../lib/mapEditor.js";
import { useCreativeEditorStore } from "./creativeEditorStore.js";

beforeEach(() => {
  setActivePinia(createPinia());
});

describe("creativeEditorStore", () => {
  it("reconnaît le preset correspondant à la taille, murs du contour compris", () => {
    const editor = useCreativeEditorStore();

    editor.resetForSize(15, 9);

    // La carte fait 17x11 une fois le contour ajouté, alors que le preset
    // décrit la zone jouable (15x9) : sans ce +2, aucune carte ne
    // correspondrait jamais à son propre preset.
    expect(editor.map.width).toBe(17);
    expect(editor.selectedId).toBe("duel-m");
  });

  it("reste en taille libre même quand la taille saisie tombe sur un preset", () => {
    const editor = useCreativeEditorStore();

    editor.selectCustomSize();
    editor.resetForSize(15, 9, CUSTOM_SIZE_ID);

    // Sinon les champs de saisie disparaîtraient sous les doigts de
    // l'utilisateur au moment précis où il tape une taille "ronde".
    expect(editor.selectedId).toBe(CUSTOM_SIZE_ID);
  });

  it("passe en taille libre sans détruire la carte en cours", () => {
    const editor = useCreativeEditorStore();
    const before = editor.map;

    editor.selectCustomSize();

    expect(editor.selectedId).toBe(CUSTOM_SIZE_ID);
    expect(editor.map).toBe(before);
  });

  it("bascule sur 'sur mesure' pour une carte chargée qui ne suit aucun preset", () => {
    const editor = useCreativeEditorStore();

    editor.loadMap({ id: "abc", name: "Ma carte", ...createEmptyMap(22, 7) });

    expect(editor.selectedId).toBe(CUSTOM_SIZE_ID);
    expect(editor.currentMapId).toBe("abc");
    expect(editor.mapName).toBe("Ma carte");
  });

  it("détache la carte sauvegardée en cours quand une matrice est importée", () => {
    const editor = useCreativeEditorStore();
    editor.loadMap({ id: "abc", name: "Ma carte", ...createEmptyMap(15, 9) });

    editor.importMap(createEmptyMap(11, 7));

    // Une matrice importée est une NOUVELLE carte : sauvegarder juste après
    // ne doit pas écraser celle qu'on était en train de modifier.
    expect(editor.currentMapId).toBeUndefined();
    expect(editor.mapName).toBe("");
    expect(editor.map.width).toBe(13);
  });
});

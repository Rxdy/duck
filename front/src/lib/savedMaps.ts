import type { EditorMap, TileKind } from "./mapEditor.js";

export interface SavedMap {
  id: string;
  name: string;
  width: number;
  height: number;
  tiles: TileKind[][];
  updatedAt: string;
}

/**
 * Sauvegarde une carte dans une liste : met à jour l'entrée existante si `id`
 * correspond à une carte déjà présente, sinon en crée une nouvelle (UUID).
 * Fonction pure — ne touche pas au stockage, pour rester facilement testable.
 */
export function upsertMap(
  maps: SavedMap[],
  input: { id?: string; name: string; map: EditorMap },
): { maps: SavedMap[]; saved: SavedMap } {
  const existingIndex = input.id ? maps.findIndex((m) => m.id === input.id) : -1;

  const saved: SavedMap = {
    id: existingIndex >= 0 ? maps[existingIndex]!.id : crypto.randomUUID(),
    name: input.name.trim() || "Carte sans nom",
    width: input.map.width,
    height: input.map.height,
    tiles: input.map.tiles,
    updatedAt: new Date().toISOString(),
  };

  const nextMaps =
    existingIndex >= 0 ? maps.map((m, i) => (i === existingIndex ? saved : m)) : [...maps, saved];

  return { maps: nextMaps, saved };
}

export function removeMap(maps: SavedMap[], id: string): SavedMap[] {
  return maps.filter((m) => m.id !== id);
}

const STORAGE_KEY = "duck:maps";

/** Frontière d'E/S (localStorage) — volontairement non testée unitairement. */
export function loadSavedMaps(): SavedMap[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as SavedMap[]) : [];
  } catch {
    return [];
  }
}

export function persistSavedMaps(maps: SavedMap[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(maps));
  } catch {
    // Stockage plein ou indisponible : on ignore, ce n'est pas critique.
  }
}

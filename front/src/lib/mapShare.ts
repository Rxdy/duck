import { isSpawnKind, type TileKind } from "./mapEditor.js";
import type { SavedMap } from "./mapsApi.js";

function sanitizeTileKind(value: unknown): TileKind {
  if (value === "empty" || value === "wall") return value;
  if (typeof value === "string" && isSpawnKind(value as TileKind)) return value as TileKind;
  return "empty";
}

/**
 * Valide un JSON importé (fichier partagé par un autre joueur, voir
 * exportMapAsFile). L'identité de la carte d'origine n'est JAMAIS reprise :
 * l'importer crée une nouvelle carte sur le compte (le serveur lui donne son
 * id, voir lib/mapsApi.ts), donc réimporter deux fois le même fichier ne peut
 * pas écraser quoi que ce soit. `undefined` si la structure de base (nom,
 * dimensions, cases) n'est pas exploitable.
 */
export interface ImportedMap {
  name: string;
  width: number;
  height: number;
  tiles: TileKind[][];
}

export function parseImportedMap(raw: unknown): ImportedMap | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const r = raw as Record<string, unknown>;

  if (typeof r.name !== "string") return undefined;
  if (typeof r.width !== "number" || typeof r.height !== "number") return undefined;
  if (!Array.isArray(r.tiles)) return undefined;

  const tiles: TileKind[][] = r.tiles.map((row) =>
    Array.isArray(row) ? row.map(sanitizeTileKind) : [],
  );

  return {
    name: r.name.trim() || "Carte importée",
    width: r.width,
    height: r.height,
    tiles,
  };
}

/** Frontière d'E/S (téléchargement navigateur) — volontairement non testée unitairement. */
export function exportMapAsFile(map: SavedMap): void {
  const blob = new Blob([JSON.stringify(map, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${map.name.replace(/[^a-z0-9-]+/gi, "-").toLowerCase() || "carte"}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

/** Frontière d'E/S (lecture fichier) — volontairement non testée unitairement. */
export async function readMapFile(file: File): Promise<unknown> {
  return JSON.parse(await file.text());
}

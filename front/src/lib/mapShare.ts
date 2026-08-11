import { isSpawnKind, type TileKind } from "./mapEditor.js";
import type { SavedMap } from "./savedMaps.js";

function sanitizeTileKind(value: unknown): TileKind {
  if (value === "empty" || value === "wall") return value;
  if (typeof value === "string" && isSpawnKind(value as TileKind)) return value as TileKind;
  return "empty";
}

/**
 * Valide un JSON importé (fichier partagé par un autre joueur, voir
 * exportMapAsFile) et le transforme en SavedMap prêt à rejoindre sa propre
 * liste. Un id/updatedAt frais est toujours généré : on ne reprend jamais
 * l'identité de la carte d'origine, pour ne jamais entrer en collision avec
 * une carte déjà présente localement — y compris en réimportant deux fois le
 * même fichier. `undefined` si la structure de base (nom, dimensions, cases)
 * n'est pas exploitable.
 */
export function parseImportedMap(raw: unknown): SavedMap | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const r = raw as Record<string, unknown>;

  if (typeof r.name !== "string") return undefined;
  if (typeof r.width !== "number" || typeof r.height !== "number") return undefined;
  if (!Array.isArray(r.tiles)) return undefined;

  const tiles: TileKind[][] = r.tiles.map((row) =>
    Array.isArray(row) ? row.map(sanitizeTileKind) : [],
  );

  return {
    id: crypto.randomUUID(),
    name: r.name.trim() || "Carte importée",
    width: r.width,
    height: r.height,
    tiles,
    updatedAt: new Date().toISOString(),
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

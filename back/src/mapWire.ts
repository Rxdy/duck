import { Tile, type GameMap } from "./game-engine/index.js";

const TILE_VALUES = new Set<string>(Object.values(Tile));

/**
 * Construit un GameMap validé à partir des données brutes reçues du client
 * (éditeur de carte custom, message JOIN_TEST). Toute valeur de case inconnue
 * ou tableau mal formé retombe sur une case vide plutôt que de planter —
 * le client ne fait jamais confiance côté serveur, même pour l'entraînement.
 */
export function buildMapFromWire(raw: {
  width: number;
  height: number;
  tiles: string[][];
}): GameMap {
  const width = Math.max(1, Math.floor(raw.width) || 1);
  const height = Math.max(1, Math.floor(raw.height) || 1);

  const tiles: Tile[][] = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => {
      const value = raw.tiles[y]?.[x];
      return value && TILE_VALUES.has(value) ? (value as Tile) : Tile.Empty;
    }),
  );

  return { width, height, tiles };
}

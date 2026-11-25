import { Tile, isWithinBounds, tileAt, type GameMap } from "./game-engine/index.js";
import type { WireSpawn } from "./protocol.js";

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
      const value = raw.tiles?.[y]?.[x];
      return value && TILE_VALUES.has(value) ? (value as Tile) : Tile.Empty;
    }),
  );

  return { width, height, tiles };
}

/**
 * Valide la liste de spawns envoyée par le client (position + indice de
 * couleur, voir protocol.ts#WireSpawn) contre la carte déjà construite :
 * toute position hors limites ou qui ne correspond pas réellement à une case
 * Spawn est écartée plutôt que de faire confiance aveuglément au client.
 *
 * Un indice de couleur absent ou aberrant retombe sur le rang du spawn dans
 * la liste : la partie garde des couleurs distinctes (le pire cas est une
 * teinte inattendue, jamais deux canards de la même couleur).
 */
export function parseWireSpawns(raw: WireSpawn[], map: GameMap): WireSpawn[] {
  return raw
    .filter(
      (spawn) =>
        Number.isInteger(spawn?.x) &&
        Number.isInteger(spawn?.y) &&
        isWithinBounds(map, spawn.x, spawn.y) &&
        tileAt(map, spawn.x, spawn.y) === Tile.Spawn,
    )
    .map((spawn, index) => ({
      x: spawn.x,
      y: spawn.y,
      color: Number.isInteger(spawn.color) && spawn.color >= 0 ? spawn.color : index,
    }));
}

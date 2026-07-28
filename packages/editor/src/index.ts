import { type GameMap, Tile, isWithinBounds } from "@duck/game-engine";

// Logique pure de l'éditeur de cartes : pas de rendu, pas d'état React.
// Le composant UI (dans apps/client) appelle ces fonctions et affiche le résultat.
export function setTile(map: GameMap, x: number, y: number, tile: Tile): GameMap {
  if (!isWithinBounds(map, x, y)) return map;

  const tiles = map.tiles.map((row, rowIndex) =>
    rowIndex === y ? row.map((cell, cellIndex) => (cellIndex === x ? tile : cell)) : row,
  );

  return { ...map, tiles };
}

export function createEmptyMap(width: number, height: number): GameMap {
  return {
    width,
    height,
    tiles: Array.from({ length: height }, () => Array.from({ length: width }, () => Tile.Empty)),
  };
}

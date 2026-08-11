import { type GameMap, Tile, isWithinBounds } from "../game-engine/index.js";

// Logique pure de l'éditeur de cartes : pas de rendu, pas d'état React.
export function setTile(map: GameMap, x: number, y: number, tile: Tile): GameMap {
  if (!isWithinBounds(map, x, y)) return map;

  const tiles = map.tiles.map((row, rowIndex) =>
    rowIndex === y ? row.map((cell, cellIndex) => (cellIndex === x ? tile : cell)) : row,
  );

  return { ...map, tiles };
}

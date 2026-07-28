export enum Tile {
  Empty = "Empty",
  Wall = "Wall",
  Spawn = "Spawn",
  Goal = "Goal",
  Water = "Water",
  Bonus = "Bonus",
}

export interface GameMap {
  width: number;
  height: number;
  tiles: Tile[][];
}

export function tileAt(map: GameMap, x: number, y: number): Tile | undefined {
  return map.tiles[y]?.[x];
}

export function isWithinBounds(map: GameMap, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < map.width && y < map.height;
}

export function isWalkable(map: GameMap, x: number, y: number): boolean {
  if (!isWithinBounds(map, x, y)) return false;
  return tileAt(map, x, y) !== Tile.Wall;
}

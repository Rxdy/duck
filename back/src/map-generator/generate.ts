import { Tile, type GameMap } from "../game-engine/index.js";
import { createRng } from "./rng.js";

export interface GenerateMapOptions {
  width: number;
  height: number;
  seed: number;
  bonusRate?: number;
}

export function generateMap(options: GenerateMapOptions): GameMap {
  const { width, height, seed, bonusRate = 0.05 } = options;
  const rng = createRng(seed);

  const tiles: Tile[][] = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => {
      const isBorder = x === 0 || y === 0 || x === width - 1 || y === height - 1;
      if (isBorder) return Tile.Wall;
      if (rng() < bonusRate) return Tile.Bonus;
      return Tile.Empty;
    }),
  );

  const midY = Math.floor(height / 2);
  tiles[midY]![1] = Tile.Spawn;
  tiles[midY]![width - 2] = Tile.Goal;

  return { width, height, tiles };
}

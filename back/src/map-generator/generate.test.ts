import { describe, expect, it } from "vitest";
import { Tile } from "../game-engine/index.js";
import { generateMap } from "./generate.js";

describe("generateMap", () => {
  it("surrounds the map with walls", () => {
    const map = generateMap({ width: 5, height: 5, seed: 1 });

    for (let x = 0; x < map.width; x++) {
      expect(map.tiles[0]![x]).toBe(Tile.Wall);
      expect(map.tiles[map.height - 1]![x]).toBe(Tile.Wall);
    }
    for (let y = 0; y < map.height; y++) {
      expect(map.tiles[y]![0]).toBe(Tile.Wall);
      expect(map.tiles[y]![map.width - 1]).toBe(Tile.Wall);
    }
  });

  it("is deterministic for a given seed", () => {
    const a = generateMap({ width: 8, height: 8, seed: 42 });
    const b = generateMap({ width: 8, height: 8, seed: 42 });
    expect(a.tiles).toEqual(b.tiles);
  });

  it("places one spawn and one goal", () => {
    const map = generateMap({ width: 6, height: 6, seed: 7 });
    const flat = map.tiles.flat();
    expect(flat.filter((t) => t === Tile.Spawn)).toHaveLength(1);
    expect(flat.filter((t) => t === Tile.Goal)).toHaveLength(1);
  });
});

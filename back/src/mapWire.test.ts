import { describe, expect, it } from "vitest";
import { Tile } from "./game-engine/index.js";
import { buildMapFromWire } from "./mapWire.js";

describe("buildMapFromWire", () => {
  it("parses known tile values", () => {
    const map = buildMapFromWire({ width: 2, height: 1, tiles: [["Wall", "Spawn"]] });
    expect(map.tiles[0]).toEqual([Tile.Wall, Tile.Spawn]);
  });

  it("falls back to Empty for unknown or missing values", () => {
    const map = buildMapFromWire({ width: 3, height: 1, tiles: [["Wall", "n'importe quoi"]] });
    expect(map.tiles[0]).toEqual([Tile.Wall, Tile.Empty, Tile.Empty]);
  });

  it("clamps width/height to at least 1 even with bogus input", () => {
    const map = buildMapFromWire({ width: 0, height: -5, tiles: [] });
    expect(map.width).toBe(1);
    expect(map.height).toBe(1);
    expect(map.tiles).toHaveLength(1);
    expect(map.tiles[0]).toHaveLength(1);
  });
});

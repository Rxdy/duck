import { describe, expect, it } from "vitest";
import { Tile, type GameMap } from "./game-engine/index.js";
import { buildMapFromWire, parseWireSpawns } from "./mapWire.js";

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

describe("parseWireSpawns", () => {
  const map: GameMap = {
    width: 3,
    height: 1,
    tiles: [[Tile.Spawn, Tile.Empty, Tile.Spawn]],
  };

  it("keeps positions that are genuinely a Spawn tile, in order", () => {
    expect(
      parseWireSpawns(
        [
          { x: 0, y: 0 },
          { x: 2, y: 0 },
        ],
        map,
      ),
    ).toEqual([
      { x: 0, y: 0 },
      { x: 2, y: 0 },
    ]);
  });

  it("drops a position that isn't a Spawn tile on the actual map", () => {
    expect(parseWireSpawns([{ x: 1, y: 0 }], map)).toEqual([]);
  });

  it("drops out-of-bounds or malformed positions instead of trusting the client", () => {
    expect(
      parseWireSpawns(
        [
          { x: 99, y: 0 },
          { x: -1, y: 0 },
        ],
        map,
      ),
    ).toEqual([]);
    expect(parseWireSpawns([{ x: 0.5, y: 0 }], map)).toEqual([]);
  });
});

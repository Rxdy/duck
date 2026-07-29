import { describe, expect, it } from "vitest";
import {
  countSpawns,
  createEmptyMap,
  placeTile,
  playableLabel,
  spawnColor,
  toPlacedTiles,
  toWireTiles,
} from "./mapEditor.js";
import { PLAYER_COLORS } from "../theme.js";

describe("createEmptyMap", () => {
  it("adds a 1-tile wall border on top of the requested playable size (walls don't shrink it)", () => {
    const map = createEmptyMap(5, 4);
    expect(map.width).toBe(7);
    expect(map.height).toBe(6);
  });

  it("seeds the border as walls so the board can't be fallen off", () => {
    const map = createEmptyMap(5, 4);
    expect(map.tiles[0]!.every((t) => t === "wall")).toBe(true);
    expect(map.tiles[map.height - 1]!.every((t) => t === "wall")).toBe(true);
    expect(map.tiles.every((row) => row[0] === "wall" && row[map.width - 1] === "wall")).toBe(true);
  });

  it("keeps the full requested playable area free", () => {
    const map = createEmptyMap(5, 4);
    for (let y = 1; y < map.height - 1; y++) {
      for (let x = 1; x < map.width - 1; x++) {
        expect(map.tiles[y]![x]).toBe("empty");
      }
    }
  });
});

describe("spawnColor", () => {
  it("maps each spawn kind to the matching player color", () => {
    expect(spawnColor("spawn-0")).toBe(PLAYER_COLORS[0]);
    expect(spawnColor("spawn-1")).toBe(PLAYER_COLORS[1]);
    expect(spawnColor("spawn-2")).toBe(PLAYER_COLORS[2]);
    expect(spawnColor("spawn-3")).toBe(PLAYER_COLORS[3]);
  });
});

describe("placeTile", () => {
  it("places a spawn on an interior tile", () => {
    const map = placeTile(createEmptyMap(5, 5), 2, 2, "spawn-0");
    expect(map.tiles[2]![2]).toBe("spawn-0");
  });

  it("never modifies the border (always walls)", () => {
    const map = placeTile(createEmptyMap(5, 5), 0, 0, "spawn-0");
    expect(map.tiles[0]![0]).toBe("wall");
  });

  it("toggles back to empty when placing the same tool on the same tile again", () => {
    let map = placeTile(createEmptyMap(5, 5), 2, 2, "spawn-0");
    expect(map.tiles[2]![2]).toBe("spawn-0");
    map = placeTile(map, 2, 2, "spawn-0");
    expect(map.tiles[2]![2]).toBe("empty");
  });

  it("overwrites a wall with a spawn (and vice versa) instead of toggling", () => {
    let map = placeTile(createEmptyMap(5, 5), 2, 2, "wall");
    expect(map.tiles[2]![2]).toBe("wall");
    map = placeTile(map, 2, 2, "spawn-0");
    expect(map.tiles[2]![2]).toBe("spawn-0");
  });

  it("moves a spawn color instead of duplicating it when placed elsewhere", () => {
    let map = placeTile(createEmptyMap(6, 6), 1, 1, "spawn-0");
    map = placeTile(map, 3, 3, "spawn-0");
    expect(map.tiles[1]![1]).toBe("empty");
    expect(map.tiles[3]![3]).toBe("spawn-0");
    expect(countSpawns(map)).toBe(1);
  });

  it("allows all 4 colors at once, never more (each color is unique)", () => {
    let map = createEmptyMap(6, 6);
    map = placeTile(map, 1, 1, "spawn-0");
    map = placeTile(map, 2, 1, "spawn-1");
    map = placeTile(map, 3, 1, "spawn-2");
    map = placeTile(map, 4, 1, "spawn-3");
    expect(countSpawns(map)).toBe(4);
  });
});

describe("toPlacedTiles", () => {
  it("flattens every cell with its coordinates and kind", () => {
    const map = createEmptyMap(3, 3); // jouable 3x3 -> plateau réel 5x5
    const placed = toPlacedTiles(map);
    expect(placed).toHaveLength(25);
    expect(placed.find((t) => t.x === 0 && t.y === 0)).toMatchObject({ kind: "wall" });
    expect(placed.find((t) => t.x === 2 && t.y === 2)).toMatchObject({ kind: "empty" });
  });
});

describe("toWireTiles", () => {
  it("converts editor kinds to the server's Tile enum values", () => {
    let map = createEmptyMap(4, 4); // jouable 4x4 -> plateau réel 6x6
    map = placeTile(map, 1, 1, "spawn-2");
    const wire = toWireTiles(map);

    expect(wire[0]).toEqual(["Wall", "Wall", "Wall", "Wall", "Wall", "Wall"]);
    expect(wire[1]![1]).toBe("Spawn");
    expect(wire[1]![2]).toBe("Empty");
  });

  it("merges every spawn color into the same generic Spawn value", () => {
    let map = createEmptyMap(6, 6);
    map = placeTile(map, 1, 1, "spawn-0");
    map = placeTile(map, 2, 1, "spawn-3");
    const wire = toWireTiles(map);

    expect(wire[1]![1]).toBe("Spawn");
    expect(wire[1]![2]).toBe("Spawn");
  });
});

describe("playableLabel", () => {
  it("is not playable under 2 spawns", () => {
    expect(playableLabel(0)).toMatch(/pas encore/i);
    expect(playableLabel(1)).toMatch(/pas encore/i);
  });

  it("maps spawn counts to the right mode", () => {
    expect(playableLabel(2)).toMatch(/duel/i);
    expect(playableLabel(3)).toMatch(/ffa 3/i);
    expect(playableLabel(4)).toMatch(/2v2|ffa 4/i);
  });
});

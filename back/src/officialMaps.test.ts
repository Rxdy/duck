import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Tile } from "./game-engine/index.js";
import { pickRandomOfficialMap } from "./officialMaps.js";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "duck-maps-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

function writeMap(filename: string, content: unknown) {
  writeFileSync(join(dir, filename), JSON.stringify(content));
}

const duelMap = {
  name: "#1 map 1v1",
  category: "duel",
  width: 4,
  height: 3,
  tiles: [
    ["wall", "wall", "wall", "wall"],
    ["wall", "spawn-0", "empty", "spawn-1"],
    ["wall", "wall", "wall", "wall"],
  ],
};

describe("pickRandomOfficialMap", () => {
  it("returns undefined when the maps directory doesn't exist yet", () => {
    expect(pickRandomOfficialMap("duel", join(dir, "does-not-exist"))).toBeUndefined();
  });

  it("returns undefined when no map matches the requested category", () => {
    writeMap("a.json", { ...duelMap, category: "equipe" });
    expect(pickRandomOfficialMap("duel", dir)).toBeUndefined();
  });

  it("converts the editor's tile kinds into a valid GameMap with ordered spawns", () => {
    writeMap("a.json", duelMap);
    const result = pickRandomOfficialMap("duel", dir)!;

    expect(result.map.tiles[1]).toEqual([Tile.Wall, Tile.Spawn, Tile.Empty, Tile.Spawn]);
    expect(result.spawns).toEqual([
      { x: 1, y: 1 },
      { x: 3, y: 1 },
    ]);
    expect(result.name).toBe("#1 map 1v1");
  });

  it("falls back to a default name when the map file doesn't have one", () => {
    writeMap("a.json", { ...duelMap, name: undefined });
    expect(pickRandomOfficialMap("duel", dir)!.name).toBe("Carte sans nom");
  });

  it("ignores non-json files and files that fail to parse", () => {
    writeMap("a.json", duelMap);
    writeFileSync(join(dir, "notes.txt"), "not a map");
    writeFileSync(join(dir, "broken.json"), "{ not valid json");

    expect(pickRandomOfficialMap("duel", dir)).toBeDefined();
  });

  it("picks among every matching map (not always the same one)", () => {
    writeMap("a.json", duelMap);
    writeMap("b.json", { ...duelMap, width: 6 });

    vi.spyOn(Math, "random").mockReturnValueOnce(0);
    const first = pickRandomOfficialMap("duel", dir)!;

    vi.spyOn(Math, "random").mockReturnValueOnce(0.99);
    const second = pickRandomOfficialMap("duel", dir)!;

    expect(first.map.width).not.toBe(second.map.width);
  });
});

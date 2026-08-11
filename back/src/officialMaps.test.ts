import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Tile } from "./game-engine/index.js";
import { listOfficialMaps, pickRandomOfficialMap } from "./officialMaps.js";

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

const trioMap = {
  name: "#1 map 1v1v1",
  category: "equipe",
  width: 5,
  height: 3,
  tiles: [
    ["wall", "wall", "wall", "wall", "wall"],
    ["wall", "spawn-0", "spawn-1", "spawn-2", "wall"],
    ["wall", "wall", "wall", "wall", "wall"],
  ],
};

describe("pickRandomOfficialMap", () => {
  it("returns undefined when the maps directory doesn't exist yet", () => {
    expect(pickRandomOfficialMap(2, join(dir, "does-not-exist"))).toBeUndefined();
  });

  it("returns undefined when no map has the requested number of bases", () => {
    // Une carte à 2 bases ne peut pas accueillir une partie à 3 : la lancer
    // quand même laisserait un joueur sans base à défendre.
    writeMap("a.json", duelMap);
    expect(pickRandomOfficialMap(3, dir)).toBeUndefined();
  });

  it("picks a map by its actual number of bases, whatever its metadata says", () => {
    writeMap("duel.json", { ...duelMap, category: "equipe" });
    writeMap("trio.json", trioMap);

    expect(pickRandomOfficialMap(2, dir)!.name).toBe("#1 map 1v1");
    expect(pickRandomOfficialMap(3, dir)!.name).toBe("#1 map 1v1v1");
  });

  it("converts the editor's tile kinds into a valid GameMap with ordered spawns", () => {
    writeMap("a.json", duelMap);
    const result = pickRandomOfficialMap(2, dir)!;

    expect(result.map.tiles[1]).toEqual([Tile.Wall, Tile.Spawn, Tile.Empty, Tile.Spawn]);
    // Chaque spawn porte l'indice de SA couleur d'éditeur (spawn-0, spawn-1),
    // pour que le canard qui y apparaît ait la couleur de la case.
    expect(result.spawns).toEqual([
      { x: 1, y: 1, color: 0 },
      { x: 3, y: 1, color: 1 },
    ]);
    expect(result.name).toBe("#1 map 1v1");
  });

  it("falls back to a default name when the map file doesn't have one", () => {
    writeMap("a.json", { ...duelMap, name: undefined });
    expect(pickRandomOfficialMap(2, dir)!.name).toBe("Carte sans nom");
  });

  it("ignores non-json files and files that fail to parse", () => {
    writeMap("a.json", duelMap);
    writeFileSync(join(dir, "notes.txt"), "not a map");
    writeFileSync(join(dir, "broken.json"), "{ not valid json");

    expect(pickRandomOfficialMap(2, dir)).toBeDefined();
  });

  it("picks among every matching map (not always the same one)", () => {
    writeMap("a.json", duelMap);
    writeMap("b.json", { ...duelMap, width: 6 });

    vi.spyOn(Math, "random").mockReturnValueOnce(0);
    const first = pickRandomOfficialMap(2, dir)!;

    vi.spyOn(Math, "random").mockReturnValueOnce(0.99);
    const second = pickRandomOfficialMap(2, dir)!;

    expect(first.map.width).not.toBe(second.map.width);
  });

  describe("listOfficialMaps", () => {
    it("renvoie les cartes au format éditeur, avec leur nombre de bases", () => {
      writeMap("duel.json", duelMap);
      writeMap("trio.json", trioMap);

      const maps = listOfficialMaps(dir);

      // Format ÉDITEUR (couleurs de spawn conservées) : l'aperçu doit montrer
      // chaque base à sa couleur, ce que le "Spawn" générique du moteur ne
      // permettrait pas (voir front/src/pages/Play.vue).
      expect(maps).toHaveLength(2);
      expect(maps[0]).toMatchObject({ name: "#1 map 1v1", players: 2 });
      expect(maps[0]!.tiles[1]).toContain("spawn-0");
      expect(maps[1]).toMatchObject({ name: "#1 map 1v1v1", players: 3 });
    });

    it("trie par nombre de joueurs puis par nom", () => {
      writeMap("b.json", { ...trioMap, name: "B" });
      writeMap("a.json", { ...duelMap, name: "A" });

      expect(listOfficialMaps(dir).map((m) => m.name)).toEqual(["A", "B"]);
    });

    it("ne renvoie rien quand le dossier n'existe pas", () => {
      expect(listOfficialMaps(join(dir, "nope"))).toEqual([]);
    });
  });
});

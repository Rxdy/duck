import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { Tile, type GameMap } from "./game-engine/index.js";
import { auditBalance } from "./mapBalance.js";

const MAPS_DIR = join(process.cwd(), "maps");

function fromMatrix(rows: string[]): GameMap {
  return {
    width: rows[0]!.length,
    height: rows.length,
    tiles: rows.map((row) =>
      [...row].map((c) => (c === "#" ? Tile.Wall : c === "." ? Tile.Empty : Tile.Spawn)),
    ),
  };
}

describe("auditBalance", () => {
  it("refuse une carte traversable en ligne droite", () => {
    const map = fromMatrix(["#########", "#0.....1#", "#.......#", "#########"]);
    expect(auditBalance(map).map((p) => p.reason)).toContain("ligne droite : aucun mur en travers");
  });

  it("refuse une carte où les murs ne rallongent aucun trajet", () => {
    // Les bases ne partagent ni ligne ni colonne, mais rien ne gêne : le
    // chemin le plus court fait exactement la distance à vol d'oiseau.
    const map = fromMatrix(["#######", "#0....#", "#.....#", "#....1#", "#######"]);
    expect(auditBalance(map).map((p) => p.reason)).toContain(
      "trajet direct : les murs ne gênent pas",
    );
  });

  it("refuse un goulot qu'un seul joueur peut fermer", () => {
    // Une seule case (1,2) relie le couloir du haut à celui du bas.
    const map = fromMatrix(["#########", "#0.....##", "#.#####.#", "#......1#", "#########"]);
    expect(auditBalance(map).some((p) => p.reason.startsWith("goulot"))).toBe(true);
  });

  it("refuse une carte où un joueur a un voisin plus proche que les autres", () => {
    const map = fromMatrix([
      "###########",
      "#0.......1#",
      "#.###.###.#",
      "#.........#",
      "#....2....#",
      "###########",
    ]);
    expect(auditBalance(map).some((p) => p.reason.startsWith("profils"))).toBe(true);
  });
});

/**
 * Le vrai garde-fou : les cartes RÉELLEMENT servies aux joueurs. Ajouter une
 * carte officielle déséquilibrée fait échouer la suite, au lieu d'être
 * découvert en jouant (voir docs/02-gameplay.md#les-cartes-officielles).
 */
describe("les cartes officielles livrées", () => {
  const files = readdirSync(MAPS_DIR).filter((f) => f.endsWith(".json"));

  it("il y en a au moins trois par mode", () => {
    const perMode = new Map<number, number>();
    for (const file of files) {
      const raw = JSON.parse(readFileSync(join(MAPS_DIR, file), "utf-8")) as {
        tiles: string[][];
      };
      const spawns = new Set(raw.tiles.flat().filter((k) => k.startsWith("spawn-"))).size;
      perMode.set(spawns, (perMode.get(spawns) ?? 0) + 1);
    }
    for (const players of [2, 3, 4]) {
      expect(perMode.get(players) ?? 0, `${players} joueurs`).toBeGreaterThanOrEqual(3);
    }
  });

  it.each(files)("%s est équilibrée", (file) => {
    const raw = JSON.parse(readFileSync(join(MAPS_DIR, file), "utf-8")) as {
      width: number;
      height: number;
      tiles: string[][];
    };
    const map: GameMap = {
      width: raw.width,
      height: raw.height,
      tiles: raw.tiles.map((row) =>
        row.map((k) =>
          k === "wall" ? Tile.Wall : k.startsWith("spawn-") ? Tile.Spawn : Tile.Empty,
        ),
      ),
    };

    expect(auditBalance(map).map((p) => p.reason)).toEqual([]);
  });
});

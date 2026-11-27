import { describe, expect, it } from "vitest";
import { grassTufts, hash2, MAX_TUFTS_PER_TILE, resolveScenery } from "./scenery.js";
import { parseSettings } from "./settings.js";

describe("resolveScenery", () => {
  it("choisit selon l'appareil en auto", () => {
    expect(resolveScenery("auto", false)).toBe("paysage");
    expect(resolveScenery("auto", true)).toBe("tactique");
  });

  it("respecte un choix explicite, même sur téléphone", () => {
    expect(resolveScenery("paysage", true)).toBe("paysage");
    expect(resolveScenery("tactique", false)).toBe("tactique");
  });
});

describe("herbe", () => {
  const tiles = Array.from({ length: 100 }, (_, i) => ({ x: i % 10, y: Math.floor(i / 10) }));

  it("est la même pour tous : fixée par la case", () => {
    expect(grassTufts(tiles)).toEqual(grassTufts(tiles));
    expect(hash2(3, 4, 1)).toBe(hash2(3, 4, 1));
  });

  it("reste dans sa case et dans la limite de touffes", () => {
    const tufts = grassTufts(tiles);
    expect(tufts.length).toBeGreaterThan(0);
    expect(tufts.length).toBeLessThanOrEqual(tiles.length * MAX_TUFTS_PER_TILE);
    for (const t of tufts) {
      const fx = t.x - Math.floor(t.x);
      const fz = t.z - Math.floor(t.z);
      expect(fx).toBeGreaterThanOrEqual(0.15);
      expect(fx).toBeLessThanOrEqual(0.85);
      expect(fz).toBeGreaterThanOrEqual(0.15);
      expect(fz).toBeLessThanOrEqual(0.85);
    }
  });

  it("ne pousse nulle part sans case de sol", () => {
    expect(grassTufts([])).toEqual([]);
  });
});

describe("réglage du décor", () => {
  it("part de « tactique » et ignore une valeur inconnue", () => {
    expect(parseSettings(null).scenery).toBe("tactique");
    expect(parseSettings({ scenery: "disco" }).scenery).toBe("tactique");
    expect(parseSettings({ scenery: "paysage" }).scenery).toBe("paysage");
  });
});

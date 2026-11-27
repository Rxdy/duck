import { describe, expect, it } from "vitest";
import { ACCESSOIRES } from "./accessories/accessoires.js";
import { randomThemes } from "./backdropOutfits.js";

describe("randomThemes", () => {
  it("donne le nombre demandé de tenues différentes, faites de pièces du catalogue", () => {
    const outfits = randomThemes(4);
    expect(outfits).toHaveLength(4);
    expect(new Set(outfits.map((o) => o.join(","))).size).toBe(4);
    const ids = new Set(ACCESSOIRES.map((a) => a.id));
    for (const outfit of outfits) {
      expect(outfit.length).toBeGreaterThan(0);
      for (const id of outfit) expect(ids.has(id)).toBe(true);
    }
  });

  it("change avec le hasard", () => {
    expect(randomThemes(3, () => 0)).not.toEqual(randomThemes(3, () => 0.99));
  });
});

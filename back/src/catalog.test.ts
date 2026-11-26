import { describe, expect, it } from "vitest";
import { CATALOG, publicOutfit, randomBotOutfit, SLOT_OF } from "./catalog.js";

describe("tenue des bots", () => {
  it("ne met jamais deux pièces au même emplacement, et suit le niveau", () => {
    for (let i = 0; i < 200; i++) {
      const outfit = randomBotOutfit("impossible");
      expect(publicOutfit(outfit)).toEqual(outfit);
      expect(outfit.length).toBeGreaterThanOrEqual(4);
      expect(randomBotOutfit("debutant").length).toBeLessThanOrEqual(2);
    }
  });

  it("reste valable aux bornes du hasard", () => {
    for (const draw of [0, 0.999999]) {
      expect(randomBotOutfit("expert", () => draw).every((id) => SLOT_OF.has(id))).toBe(true);
    }
  });
});

describe("publicOutfit", () => {
  it("écarte l'inconnu et le doublon d'emplacement", () => {
    const [a, b] = CATALOG.filter((item) => item.emplacement === "tete");

    expect(publicOutfit([a!.id, "inconnu", b!.id, 3])).toEqual([a!.id]);
    expect(publicOutfit(null)).toEqual([]);
  });
});

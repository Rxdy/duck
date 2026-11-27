import { describe, expect, it } from "vitest";
import { ACCESSOIRES } from "../accessories/accessoires.js";
import { NOEL, SCENES, sceneFor } from "./noel.js";

describe("scènes de saison", () => {
  it("n'habille les canards qu'avec des accessoires du catalogue, une pièce par emplacement", () => {
    const slots = new Map(ACCESSOIRES.map((a) => [a.id, a.emplacement]));
    for (const actor of NOEL.actors) {
      const worn = actor.outfit.map((id) => slots.get(id));
      expect(worn, actor.outfit.join(",")).not.toContain(undefined);
      expect(new Set(worn).size, actor.outfit.join(",")).toBe(worn.length);
    }
  });

  it("choisit Noël du 20 novembre au 6 janvier, rien ailleurs", () => {
    expect(sceneFor(new Date(2026, 10, 27))?.id).toBe("noel");
    expect(sceneFor(new Date(2026, 11, 25))?.id).toBe("noel");
    expect(sceneFor(new Date(2027, 0, 6))?.id).toBe("noel");
    expect(sceneFor(new Date(2027, 0, 7))).toBeUndefined();
    expect(sceneFor(new Date(2026, 5, 15))).toBeUndefined();
  });

  it("laisse forcer une scène connue, et ignore une inconnue", () => {
    expect(sceneFor(new Date(2026, 5, 15), "noel")).toBe(SCENES.noel);
    expect(sceneFor(new Date(2026, 5, 15), "inconnue")).toBeUndefined();
  });
});

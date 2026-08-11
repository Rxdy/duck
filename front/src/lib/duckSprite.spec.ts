import { describe, expect, it } from "vitest";
import { PLAYER_COLORS } from "../theme.js";
import { COLORBLIND_PLAYER_COLORS } from "./colorblind.js";
import { duckSpriteUrl } from "./duckSprite.js";

const FACINGS = ["se", "sw", "ne", "nw"] as const;

describe("duckSpriteUrl", () => {
  it("a un sprite pour chaque couleur de joueur et chaque direction", () => {
    for (const color of [...PLAYER_COLORS, ...COLORBLIND_PLAYER_COLORS]) {
      for (const facing of FACINGS) {
        expect(duckSpriteUrl(color, facing), `${color} ${facing}`).toBeTruthy();
      }
    }
  });

  it("donne une image différente par direction", () => {
    const urls = FACINGS.map((facing) => duckSpriteUrl(PLAYER_COLORS[0], facing));
    expect(new Set(urls).size).toBe(FACINGS.length);
  });

  it("ignore la casse et le # de la couleur", () => {
    expect(duckSpriteUrl("#ff4d6d", "se")).toBe(duckSpriteUrl("FF4D6D", "se"));
  });

  it("retombe sur la couleur générée la plus proche plutôt que sur rien", () => {
    // #00C2D1 (cyan joueur) est la couleur générée la plus proche de ce cyan
    // légèrement différent, qu'aucun jeu de sprites ne couvre.
    expect(duckSpriteUrl("#00C4D4", "se")).toBe(duckSpriteUrl("#00C2D1", "se"));
  });

  it("reste affichable même si la couleur n'a aucun sens", () => {
    expect(duckSpriteUrl("pas-une-couleur", "se")).toBeTruthy();
  });
});

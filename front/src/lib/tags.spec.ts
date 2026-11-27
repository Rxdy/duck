import { describe, expect, it } from "vitest";
import { detectTags } from "./tags.js";

const duck = (id: string, x: number, y = 2) => ({ id, x, y, color: id === "a" ? "#f00" : "#0ff" });

describe("detectTags", () => {
  it("reconnaît un toucher : l'attaquant entre là où était la victime, renvoyée chez elle", () => {
    const tags = detectTags([duck("a", 4), duck("b", 5)], [duck("a", 5), duck("b", 7)]);
    expect(tags).toEqual([{ attackerId: "a", victimId: "b", x: 5, y: 2, color: "#f00" }]);
  });

  it("ignore un simple pas et un retour à la base sans attaquant (point marqué)", () => {
    expect(detectTags([duck("a", 4), duck("b", 5)], [duck("a", 3), duck("b", 6)])).toEqual([]);
    expect(detectTags([duck("a", 1), duck("b", 6)], [duck("a", 1), duck("b", 7, 0)])).toEqual([]);
  });

  it("ignore un canard arrivé d'ailleurs qu'une case voisine", () => {
    expect(detectTags([duck("a", 1), duck("b", 5)], [duck("a", 5), duck("b", 7)])).toEqual([]);
  });

  it("ne voit rien au premier état", () => {
    expect(detectTags([], [duck("a", 1), duck("b", 5)])).toEqual([]);
  });
});

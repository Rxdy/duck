import { describe, expect, it } from "vitest";
import { slugify } from "./mapsStorage.js";

describe("slugify", () => {
  it("lowercases and replaces spaces with dashes", () => {
    expect(slugify("Ma Super Carte")).toBe("ma-super-carte");
  });

  it("strips accents", () => {
    expect(slugify("Arène Étoilée")).toBe("arene-etoilee");
  });

  it("collapses non-alphanumeric runs into a single dash and trims the edges", () => {
    expect(slugify("  duel!! 1v1  ")).toBe("duel-1v1");
  });

  it("falls back to a default name when nothing alphanumeric remains", () => {
    expect(slugify("!!!")).toBe("carte");
    expect(slugify("")).toBe("carte");
  });
});

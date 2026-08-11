import { describe, expect, it } from "vitest";
import { drawDuckSprite, duckSpriteAspect } from "./duckSprite.js";

describe("duckSpriteAspect", () => {
  it("is roughly square (the duck is squat/compact, not tall and slim)", () => {
    expect(duckSpriteAspect()).toBeCloseTo(1, 1);
  });
});

describe("drawDuckSprite", () => {
  it("returns a canvas without throwing, even without a 2D context (jsdom)", () => {
    expect(() => drawDuckSprite("#E11D48", "none", "approach")).not.toThrow();
    expect(() => drawDuckSprite("#E11D48", "none", "back")).not.toThrow();
  });

  it("caches by color+accessory+view: same inputs return the exact same canvas", () => {
    const first = drawDuckSprite("#2563EB", "top-hat", "approach");
    const second = drawDuckSprite("#2563EB", "top-hat", "approach");
    expect(second).toBe(first);
  });

  it("does not share a cache entry across different colors, accessories, or views", () => {
    const red = drawDuckSprite("#E11D48", "none", "approach");
    const blue = drawDuckSprite("#2563EB", "none", "approach");
    const redWithCap = drawDuckSprite("#E11D48", "cap", "approach");
    const redBack = drawDuckSprite("#E11D48", "none", "back");
    expect(red).not.toBe(blue);
    expect(red).not.toBe(redWithCap);
    expect(red).not.toBe(redBack);
  });
});

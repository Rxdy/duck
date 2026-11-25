import { describe, expect, it } from "vitest";
import { directionForTap } from "./touchZones.js";

describe("directionForTap", () => {
  it("returns UP for the upper-right quadrant (relative to center)", () => {
    expect(directionForTap(0.9, 0.1)).toBe("UP");
    expect(directionForTap(0.55, 0.4)).toBe("UP");
  });

  it("returns RIGHT for the lower-right quadrant", () => {
    expect(directionForTap(0.9, 0.9)).toBe("RIGHT");
    expect(directionForTap(0.55, 0.6)).toBe("RIGHT");
  });

  it("returns DOWN for the lower-left quadrant", () => {
    expect(directionForTap(0.1, 0.9)).toBe("DOWN");
    expect(directionForTap(0.45, 0.6)).toBe("DOWN");
  });

  it("returns LEFT for the upper-left quadrant", () => {
    expect(directionForTap(0.1, 0.1)).toBe("LEFT");
    expect(directionForTap(0.45, 0.4)).toBe("LEFT");
  });
});

describe("directionForTap autour du canard", () => {
  it("juge le côté par rapport au canard, pas au milieu de l'écran", () => {
    const duck = { x: 0.2, y: 0.8 };
    expect(directionForTap(0.4, 0.6, duck)).toBe("UP");
    expect(directionForTap(0.1, 0.6, duck)).toBe("LEFT");
    expect(directionForTap(0.4, 0.9, duck)).toBe("RIGHT");
    expect(directionForTap(0.1, 0.9, duck)).toBe("DOWN");
  });
});

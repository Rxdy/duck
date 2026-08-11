import { describe, expect, it } from "vitest";
import { winRatioPercent } from "./stats.js";

describe("winRatioPercent", () => {
  it("returns 0 when no game has been played (no division by zero)", () => {
    expect(winRatioPercent(0, 0)).toBe(0);
  });

  it("computes and rounds the win percentage", () => {
    expect(winRatioPercent(4, 1)).toBe(25);
    expect(winRatioPercent(3, 1)).toBe(33);
  });

  it("returns 100 when every game played was won", () => {
    expect(winRatioPercent(5, 5)).toBe(100);
  });
});

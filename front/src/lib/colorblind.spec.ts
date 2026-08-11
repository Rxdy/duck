import { describe, expect, it } from "vitest";
import { PLAYER_COLORS } from "../theme.js";
import { COLORBLIND_PLAYER_COLORS, resolvePlayerColor } from "./colorblind.js";

describe("resolvePlayerColor", () => {
  it("returns the original color when colorblind mode is off", () => {
    expect(resolvePlayerColor(PLAYER_COLORS[0], false)).toBe(PLAYER_COLORS[0]);
  });

  it("maps each known player color to its colorblind equivalent", () => {
    PLAYER_COLORS.forEach((color, index) => {
      expect(resolvePlayerColor(color, true)).toBe(COLORBLIND_PLAYER_COLORS[index]);
    });
  });

  it("leaves an unknown color untouched even in colorblind mode", () => {
    expect(resolvePlayerColor("#123456", true)).toBe("#123456");
  });
});

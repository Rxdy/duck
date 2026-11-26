import { describe, expect, it } from "vitest";
import { isModeAllowed, requiresAccount } from "./access.js";

describe("accès sans compte", () => {
  it("n'ouvre que le duel", () => {
    expect(isModeAllowed("duel", false)).toBe(true);
    expect(isModeAllowed("ffa4", false)).toBe(false);
    expect(isModeAllowed("ffa4", true)).toBe(true);
  });

  it("ferme toutes les pages du créatif", () => {
    expect(requiresAccount("/creatif")).toBe(true);
    expect(requiresAccount("/creatif/cartes")).toBe(true);
    expect(requiresAccount("/amis")).toBe(true);
    expect(requiresAccount("/salon/A1B2C3")).toBe(true);
    expect(requiresAccount("/classement")).toBe(false);
  });
});

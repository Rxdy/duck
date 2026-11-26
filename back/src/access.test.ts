import { describe, expect, it } from "vitest";
import { isAllowed } from "./access.js";

describe("isAllowed", () => {
  it("laisse un invité jouer en duel, et rien d'autre", () => {
    expect(isAllowed("duel", false)).toBe(true);
    expect(isAllowed("ffa4", false)).toBe(false);
  });

  it("ouvre tous les modes à un compte", () => {
    expect(isAllowed("ffa4", true)).toBe(true);
  });
});

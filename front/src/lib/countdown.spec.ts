import { describe, expect, it } from "vitest";
import { COUNTDOWN_MS, countdownLabel, GO_MS } from "./countdown.js";

describe("countdownLabel", () => {
  it("compte 3, 2, 1, puis lance et s'efface", () => {
    expect(countdownLabel(COUNTDOWN_MS)).toBe("3");
    expect(countdownLabel(1500)).toBe("2");
    expect(countdownLabel(1)).toBe("1");
    expect(countdownLabel(0)).toBe("Partez !");
    expect(countdownLabel(-GO_MS)).toBeUndefined();
  });
});

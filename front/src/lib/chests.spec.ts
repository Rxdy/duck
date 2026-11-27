import { describe, expect, it } from "vitest";
import { formatDuration } from "./chests.js";

describe("formatDuration", () => {
  it("écrit les durées pleines simplement", () => {
    expect(formatDuration(60 * 60_000)).toBe("1 h");
    expect(formatDuration(30 * 60_000)).toBe("30 min");
    expect(formatDuration(5 * 60_000)).toBe("5 min");
  });

  it("montre les secondes pendant le décompte", () => {
    expect(formatDuration(4 * 60_000 + 5_000)).toBe("4:05");
    expect(formatDuration(59 * 60_000 + 59_000)).toBe("59:59");
    expect(formatDuration(65 * 60_000)).toBe("1 h 05");
  });

  it("garde les secondes d'un décompte en cours, même pile sur la minute", () => {
    expect(formatDuration(5 * 60_000, true)).toBe("5:00");
    expect(formatDuration(4 * 60_000 + 59_000, true)).toBe("4:59");
  });

  it("ne descend jamais sous zéro", () => {
    expect(formatDuration(-10)).toBe("0 min");
  });
});

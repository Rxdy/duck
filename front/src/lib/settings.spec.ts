import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, parseSettings } from "./settings.js";

describe("parseSettings", () => {
  it("returns the defaults when given null or a non-object", () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings("nope")).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings(42)).toEqual(DEFAULT_SETTINGS);
  });

  it("keeps valid fields and falls back per-field otherwise", () => {
    const result = parseSettings({
      musicVolume: 30,
      sfxVolume: "not a number",
      hapticsEnabled: false,
    });

    expect(result.musicVolume).toBe(30);
    expect(result.sfxVolume).toBe(DEFAULT_SETTINGS.sfxVolume);
    expect(result.hapticsEnabled).toBe(false);
    expect(result.reducedMotion).toBe(DEFAULT_SETTINGS.reducedMotion);
  });

  it("clamps volumes to the 0-100 range", () => {
    expect(parseSettings({ musicVolume: -20 }).musicVolume).toBe(0);
    expect(parseSettings({ musicVolume: 500 }).musicVolume).toBe(100);
    expect(parseSettings({ sfxVolume: 42.6 }).sfxVolume).toBe(43);
  });

  it("merges partial key bindings with the defaults instead of dropping them all", () => {
    const result = parseSettings({ keyBindings: { UP: "KeyW" } });

    expect(result.keyBindings).toEqual({
      UP: "KeyW",
      DOWN: "ArrowDown",
      LEFT: "ArrowLeft",
      RIGHT: "ArrowRight",
    });
  });

  it("ignores non-string or empty key bindings", () => {
    const result = parseSettings({ keyBindings: { UP: "", DOWN: 42 } });

    expect(result.keyBindings.UP).toBe("ArrowUp");
    expect(result.keyBindings.DOWN).toBe("ArrowDown");
  });
});

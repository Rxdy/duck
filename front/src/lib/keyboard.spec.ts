import { describe, expect, it } from "vitest";
import { DEFAULT_KEY_BINDINGS } from "./settings.js";
import { directionForKey, labelForKeyCode } from "./keyboard.js";

describe("directionForKey", () => {
  it("maps the default arrow keys to their direction", () => {
    expect(directionForKey("ArrowUp", DEFAULT_KEY_BINDINGS)).toBe("UP");
    expect(directionForKey("ArrowDown", DEFAULT_KEY_BINDINGS)).toBe("DOWN");
    expect(directionForKey("ArrowLeft", DEFAULT_KEY_BINDINGS)).toBe("LEFT");
    expect(directionForKey("ArrowRight", DEFAULT_KEY_BINDINGS)).toBe("RIGHT");
  });

  it("follows a custom rebind", () => {
    const bindings = { ...DEFAULT_KEY_BINDINGS, UP: "KeyW" };
    expect(directionForKey("KeyW", bindings)).toBe("UP");
    expect(directionForKey("ArrowUp", bindings)).toBeUndefined();
  });

  it("returns undefined for a key that isn't bound to any direction", () => {
    expect(directionForKey("Space", DEFAULT_KEY_BINDINGS)).toBeUndefined();
  });
});

describe("labelForKeyCode", () => {
  it("renders arrows for the default bindings", () => {
    expect(labelForKeyCode("ArrowUp")).toBe("↑");
    expect(labelForKeyCode("ArrowLeft")).toBe("←");
  });

  it("strips the Key/Digit prefix for letter and number keys", () => {
    expect(labelForKeyCode("KeyW")).toBe("W");
    expect(labelForKeyCode("Digit5")).toBe("5");
  });

  it("falls back to the raw code for anything else", () => {
    expect(labelForKeyCode("Backquote")).toBe("Backquote");
  });
});

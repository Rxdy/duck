import { describe, expect, it } from "vitest";
import { CHORD_MS, createChordGuard } from "./chordGuard.js";

describe("createChordGuard", () => {
  it("ne laisse qu'un pas à deux directions enfoncées ensemble", () => {
    const guard = createChordGuard();

    expect(guard.press("ArrowUp", 0)).toBe(true);
    expect(guard.press("ArrowRight", 8)).toBe(false);
    expect(guard.press("ArrowRight", CHORD_MS - 1)).toBe(false);
  });

  it("laisse enchaîner dès qu'on relâche, même très vite", () => {
    const guard = createChordGuard();
    guard.press("ArrowUp", 0);
    guard.release("ArrowUp");

    expect(guard.press("ArrowRight", 20)).toBe(true);
  });

  it("laisse enchaîner en gardant un doigt appuyé, au rythme d'un joueur rapide", () => {
    const guard = createChordGuard();
    guard.press("ArrowUp", 0);

    expect(guard.press("ArrowRight", CHORD_MS)).toBe(true);
  });

  it("oublie les touches quand la fenêtre est quittée", () => {
    const guard = createChordGuard();
    guard.press("ArrowUp", 0);
    guard.reset();

    expect(guard.press("ArrowRight", 1)).toBe(true);
  });
});

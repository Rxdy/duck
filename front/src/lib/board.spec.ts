import { describe, expect, it } from "vitest";
import { PLAYER_COLORS } from "../theme.js";
import {
  BOARD_PRESETS,
  buildBoardTiles,
  computeIsometricFrame,
  computeTopDownFrame,
  isWebglAvailable,
  tileColor,
} from "./board.js";

describe("buildBoardTiles", () => {
  it("generates width * height tiles", () => {
    expect(buildBoardTiles(3, 2)).toHaveLength(6);
  });

  it("covers every coordinate exactly once", () => {
    const tiles = buildBoardTiles(4, 4);
    const coords = new Set(tiles.map((t) => `${t.x},${t.y}`));
    expect(coords.size).toBe(16);
  });

  it("alternates shade like a checkerboard", () => {
    const tiles = buildBoardTiles(2, 2);
    const shadeAt = (x: number, y: number) => tiles.find((t) => t.x === x && t.y === y)?.shade;
    expect(shadeAt(0, 0)).toBe(shadeAt(1, 1));
    expect(shadeAt(0, 0)).not.toBe(shadeAt(1, 0));
    expect(shadeAt(0, 0)).not.toBe(shadeAt(0, 1));
  });
});

describe("computeIsometricFrame", () => {
  it("targets the center of the board", () => {
    expect(computeIsometricFrame(30, 30).target).toEqual([15, 0, 15]);
    expect(computeIsometricFrame(40, 20).target).toEqual([20, 0, 10]);
  });

  it("positions the camera above the board, looking down (positive Y)", () => {
    expect(computeIsometricFrame(40, 40).position[1]).toBeGreaterThan(0);
  });

  it("keeps camera offset equal on X and Z for a symmetric isometric angle", () => {
    const frame = computeIsometricFrame(30, 30);
    const offsetX = frame.position[0] - frame.target[0];
    const offsetZ = frame.position[2] - frame.target[2];
    expect(offsetX).toBeCloseTo(offsetZ);
  });

  it("grows the view size with board size", () => {
    const small = computeIsometricFrame(30, 30).viewSize;
    const big = computeIsometricFrame(50, 50).viewSize;
    expect(big).toBeGreaterThan(small);
  });
});

describe("computeTopDownFrame", () => {
  it("targets the center of the board", () => {
    expect(computeTopDownFrame(30, 30).target).toEqual([15, 0, 15]);
    expect(computeTopDownFrame(40, 20).target).toEqual([20, 0, 10]);
  });

  it("positions the camera directly above the center (same X/Z as target)", () => {
    const frame = computeTopDownFrame(30, 30);
    expect(frame.position[0]).toBe(frame.target[0]);
    expect(frame.position[2]).toBe(frame.target[2]);
    expect(frame.position[1]).toBeGreaterThan(0);
  });

  it("uses a non-degenerate up vector when looking straight down", () => {
    const frame = computeTopDownFrame(30, 30);
    // Le up par défaut (0,1,0) serait parallèle à la direction de vue : il doit être différent.
    expect(frame.up).not.toEqual([0, 1, 0]);
  });

  it("grows the view size with board size", () => {
    const small = computeTopDownFrame(30, 30).viewSize;
    const big = computeTopDownFrame(50, 50).viewSize;
    expect(big).toBeGreaterThan(small);
  });
});

describe("BOARD_PRESETS", () => {
  it("has unique ids", () => {
    const ids = BOARD_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps duel presets rectangular (wider than tall), not square", () => {
    for (const preset of BOARD_PRESETS.filter((p) => p.category === "duel")) {
      expect(preset.width).toBeGreaterThan(preset.height);
    }
  });

  it("keeps équipe presets square", () => {
    for (const preset of BOARD_PRESETS.filter((p) => p.category === "equipe")) {
      expect(preset.width).toBe(preset.height);
    }
  });

  it("caps every preset at 20x20, no oversized boards for now", () => {
    for (const preset of BOARD_PRESETS) {
      expect(preset.width).toBeLessThanOrEqual(20);
      expect(preset.height).toBeLessThanOrEqual(20);
    }
  });
});

describe("tileColor", () => {
  it("gives walls their own solid color", () => {
    expect(tileColor("wall", "light")).toBe("#6b7280");
  });

  it("colors each spawn with its matching player color", () => {
    expect(tileColor("spawn-0", "dark")).toBe(PLAYER_COLORS[0]);
    expect(tileColor("spawn-3", "light")).toBe(PLAYER_COLORS[3]);
  });

  it("falls back to the checkerboard shade for empty tiles or no editor data", () => {
    expect(tileColor("empty", "light")).toBe("#33415b");
    expect(tileColor("empty", "dark")).toBe("#28374d");
    expect(tileColor(undefined, "light")).toBe("#33415b");
  });
});

describe("isWebglAvailable", () => {
  it("returns false when the canvas can't create any WebGL context (e.g. jsdom)", () => {
    expect(isWebglAvailable()).toBe(false);
  });

  it("returns true when the canvas can create a WebGL context", () => {
    const original = HTMLCanvasElement.prototype.getContext;
    // @ts-expect-error mock simplifié pour le test, la vraie signature retourne un vrai contexte
    HTMLCanvasElement.prototype.getContext = () => ({});

    expect(isWebglAvailable()).toBe(true);

    HTMLCanvasElement.prototype.getContext = original;
  });
});

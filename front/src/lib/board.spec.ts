import { describe, expect, it } from "vitest";
import { PLAYER_COLORS } from "../theme.js";
import {
  applyTerritoryTint,
  BOARD_PRESETS,
  buildBoardMeshes,
  buildBoardTiles,
  computeIsometricFrame,
  computeTopDownFrame,
  directionFacing,
  FLOOR_HEIGHT,
  isWebglAvailable,
  mixHexColors,
  tileColor,
  WALL_HEIGHT,
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

describe("buildBoardMeshes", () => {
  const meshAt = (meshes: ReturnType<typeof buildBoardMeshes>, x: number, y: number) =>
    meshes.find((m) => m.x === x && m.y === y);

  it("covers the whole board, even where the editor placed nothing", () => {
    expect(buildBoardMeshes({ width: 4, height: 3 })).toHaveLength(12);
  });

  it("raises walls above the floor", () => {
    const meshes = buildBoardMeshes({
      width: 2,
      height: 1,
      tiles: [{ x: 0, y: 0, kind: "wall" }],
    });

    expect(meshAt(meshes, 0, 0)!.height).toBe(WALL_HEIGHT);
    expect(meshAt(meshes, 1, 0)!.height).toBe(FLOOR_HEIGHT);
  });

  it("stands every tile on the same ground", () => {
    // A wall grows upwards from the floor rather than floating above it or
    // being half-buried: all tiles share the same bottom, never the same centre.
    const meshes = buildBoardMeshes({
      width: 2,
      height: 1,
      tiles: [{ x: 0, y: 0, kind: "wall" }],
    });
    const bottom = (mesh: { centerY: number; height: number }) => mesh.centerY - mesh.height / 2;

    expect(bottom(meshAt(meshes, 0, 0)!)).toBeCloseTo(bottom(meshAt(meshes, 1, 0)!));
  });

  it("paints the exact base tile in the player's colour", () => {
    // In a real match the server only sends a generic "Spawn" with no colour,
    // so the tile you must reach to score would otherwise be invisible.
    const meshes = buildBoardMeshes({
      width: 3,
      height: 1,
      bases: [{ x: 1, y: 0, color: "#ff0000" }],
    });

    expect(meshAt(meshes, 1, 0)!.color).toBe("#ff0000");
  });

  it("never tints a wall with a nearby territory", () => {
    const withoutBase = buildBoardMeshes({
      width: 3,
      height: 1,
      tiles: [{ x: 1, y: 0, kind: "wall" }],
    });
    const withBase = buildBoardMeshes({
      width: 3,
      height: 1,
      tiles: [{ x: 1, y: 0, kind: "wall" }],
      bases: [{ x: 0, y: 0, color: "#ff0000" }],
    });

    expect(meshAt(withBase, 1, 0)!.color).toBe(meshAt(withoutBase, 1, 0)!.color);
  });

  it("follows the interface theme", () => {
    const dark = buildBoardMeshes({ width: 1, height: 1, theme: "dark" });
    const light = buildBoardMeshes({ width: 1, height: 1, theme: "light" });

    expect(dark[0]!.color).not.toBe(light[0]!.color);
  });
});

describe("computeIsometricFrame", () => {
  it("serre le cadrage quand on réduit `fit`", () => {
    // Seul levier pour qu'un plateau remplisse son cadre : la hauteur du
    // conteneur n'y change rien, la caméra orthographique montre toujours la
    // même tranche de monde en vertical (voir molecules/MapPreviewList.vue).
    const partie = computeIsometricFrame(20, 12);
    const apercu = computeIsometricFrame(20, 12, 0.44);

    expect(apercu.viewSize).toBeLessThan(partie.viewSize);
    expect(apercu.target).toEqual(partie.target);
    expect(apercu.position).toEqual(partie.position);
  });

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

describe("directionFacing", () => {
  it("faces SE/NW on horizontal movement (RIGHT/LEFT on the grid)", () => {
    expect(directionFacing(1, 0)).toBe("se");
    expect(directionFacing(-1, 0)).toBe("nw");
  });

  it("faces SW/NE on vertical movement (DOWN/UP on the grid)", () => {
    expect(directionFacing(0, 1)).toBe("sw");
    expect(directionFacing(0, -1)).toBe("ne");
  });

  it("prioritizes horizontal over vertical if somehow both are set", () => {
    expect(directionFacing(1, 1)).toBe("se");
  });

  it("returns undefined when there is no movement at all", () => {
    expect(directionFacing(0, 0)).toBeUndefined();
  });
});

describe("mixHexColors", () => {
  it("returns the base color untouched at ratio 0", () => {
    expect(mixHexColors("#28374d", "#ff4d6d", 0)).toBe("#28374d");
  });

  it("returns the tint color untouched at ratio 1", () => {
    expect(mixHexColors("#28374d", "#ff4d6d", 1)).toBe("#ff4d6d");
  });

  it("blends partway between the two colors", () => {
    expect(mixHexColors("#000000", "#ffffff", 0.5)).toBe("#808080");
  });
});

describe("applyTerritoryTint", () => {
  const floor = "#28374d";
  const playerColor = "#ff4d6d";

  it("leaves the floor color untouched with no bases nearby", () => {
    expect(applyTerritoryTint(floor, 10, 10, [{ x: 0, y: 0, color: playerColor }])).toBe(floor);
  });

  it("tints a tile within the territory radius", () => {
    const tinted = applyTerritoryTint(floor, 2, 0, [{ x: 0, y: 0, color: playerColor }]);
    expect(tinted).not.toBe(floor);
  });

  it("leaves a tile just outside the radius untouched", () => {
    expect(applyTerritoryTint(floor, 0, 10, [{ x: 0, y: 0, color: playerColor }])).toBe(floor);
  });

  it("uses the nearest base's color when two territories overlap", () => {
    const nearRed = applyTerritoryTint(floor, 1, 0, [
      { x: 0, y: 0, color: "#ff0000" },
      { x: 3, y: 0, color: "#0000ff" },
    ]);
    const closeToRedOnly = applyTerritoryTint(floor, 1, 0, [{ x: 0, y: 0, color: "#ff0000" }]);
    expect(nearRed).toBe(closeToRedOnly);
  });

  it("does not tint through a wall, even within radius (light-like behavior)", () => {
    const isWall = (x: number, y: number) => x === 1 && y === 0;
    const tinted = applyTerritoryTint(floor, 2, 0, [{ x: 0, y: 0, color: playerColor }], isWall);
    expect(tinted).toBe(floor);
  });

  it("still tints when no wall stands between the tile and the base", () => {
    const isWall = (x: number, y: number) => x === 5 && y === 5; // ailleurs, hors du chemin
    const tinted = applyTerritoryTint(floor, 2, 0, [{ x: 0, y: 0, color: playerColor }], isWall);
    expect(tinted).not.toBe(floor);
  });

  it("falls back to another base whose line of sight isn't blocked", () => {
    const isWall = (x: number, y: number) => x === 1 && y === 0; // bloque la base rouge (0,0)
    const tinted = applyTerritoryTint(
      floor,
      2,
      0,
      [
        { x: 0, y: 0, color: "#ff0000" },
        { x: 2, y: 2, color: "#0000ff" },
      ],
      isWall,
    );
    expect(tinted).toBe(applyTerritoryTint(floor, 2, 0, [{ x: 2, y: 2, color: "#0000ff" }]));
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

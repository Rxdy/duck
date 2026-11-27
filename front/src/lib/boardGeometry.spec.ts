import { describe, expect, it } from "vitest";
import { buildBoardMeshes } from "./board.js";
import { mergeBoard } from "./boardGeometry.js";

describe("mergeBoard", () => {
  it("réunit tout le plateau en une seule géométrie, couleurs comprises", () => {
    const meshes = buildBoardMeshes({
      width: 8,
      height: 6,
      tiles: [{ x: 2, y: 2, kind: "wall" }],
    });
    const geometry = mergeBoard(meshes);
    // 6 faces × 2 triangles × 3 sommets par case.
    expect(geometry.getAttribute("position").count).toBe(8 * 6 * 36);
    expect(geometry.getAttribute("color").count).toBe(8 * 6 * 36);
  });

  it("accepte un plateau vide", () => {
    expect(mergeBoard([]).getAttribute("position")).toBeUndefined();
  });
});

describe("paysage", () => {
  it("n'herbe que le sol libre, pas les murs ni les bases", () => {
    const meshes = buildBoardMeshes({
      width: 4,
      height: 4,
      tiles: [
        { x: 1, y: 1, kind: "wall" },
        { x: 2, y: 2, kind: "spawn-0" },
      ],
      scenery: "paysage",
    });
    const plain = meshes.filter((m) => m.plain);
    expect(plain).toHaveLength(14);
    expect(meshes.find((m) => m.x === 1 && m.y === 1)?.plain).toBe(false);
    expect(meshes.find((m) => m.x === 2 && m.y === 2)?.plain).toBe(false);
  });

  it("verdit le sol mais garde les couleurs des joueurs", () => {
    const tactical = buildBoardMeshes({ width: 3, height: 3 });
    const landscape = buildBoardMeshes({ width: 3, height: 3, scenery: "paysage" });
    expect(landscape[0]!.color).not.toBe(tactical[0]!.color);
  });
});

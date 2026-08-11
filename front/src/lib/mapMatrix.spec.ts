import { describe, expect, it } from "vitest";
import { createEmptyMap, placeTile } from "./mapEditor.js";
import { parseMatrixText, toMatrixText } from "./mapMatrix.js";

function textOf(lines: string[]): string {
  return lines.join("\n");
}

const VALID = [
  "#########",
  "#0.....1#",
  "#..###..#",
  "#.......#",
  "#2.....3#",
  "#########",
  "#########",
];

describe("toMatrixText", () => {
  it("écrit murs, cases vides et spawns numérotés", () => {
    let map = createEmptyMap(5, 5);
    map = placeTile(map, 1, 1, "spawn-0");
    map = placeTile(map, 5, 5, "spawn-3");
    map = placeTile(map, 3, 3, "wall");

    expect(toMatrixText(map)).toBe(
      textOf(["#######", "#0....#", "#.....#", "#..#..#", "#.....#", "#....3#", "#######"]),
    );
  });
});

describe("parseMatrixText", () => {
  it("relit ce que toMatrixText a écrit, à l'identique", () => {
    let map = createEmptyMap(8, 6);
    map = placeTile(map, 1, 1, "spawn-0");
    map = placeTile(map, 8, 6, "spawn-1");
    map = placeTile(map, 4, 3, "wall");

    const result = parseMatrixText(toMatrixText(map));

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.map).toEqual(map);
  });

  it("accepte une matrice écrite à la main", () => {
    const result = parseMatrixText(textOf(VALID));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.map.width).toBe(9);
      expect(result.map.height).toBe(7);
      expect(result.map.tiles[1]![1]).toBe("spawn-0");
      expect(result.map.tiles[4]![7]).toBe("spawn-3");
      expect(result.warnings).toEqual([]);
    }
  });

  it("ignore les lignes vides autour du bloc collé", () => {
    const result = parseMatrixText(`\n\n${textOf(VALID)}\n\n`);
    expect(result.ok).toBe(true);
  });

  it("accepte l'espace comme case vide", () => {
    const withSpaces = VALID.map((line) => line.replaceAll(".", " "));
    const result = parseMatrixText(textOf(withSpaces));

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.map.tiles[3]![4]).toBe("empty");
  });

  it("refuse des lignes de largeurs différentes, en disant laquelle", () => {
    const result = parseMatrixText(textOf([...VALID.slice(0, 2), "#..#", ...VALID.slice(3)]));

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("ligne 3");
  });

  it("refuse un caractère inconnu en donnant sa position", () => {
    const result = parseMatrixText(textOf([...VALID.slice(0, 3), "#...X...#", ...VALID.slice(4)]));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("X");
      expect(result.error).toContain("ligne 4");
      expect(result.error).toContain("colonne 5");
    }
  });

  it("refuse deux fois la même couleur de spawn", () => {
    const result = parseMatrixText(textOf([...VALID.slice(0, 4), "#0.....3#", ...VALID.slice(5)]));

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("spawn 0");
  });

  it("refuse une carte hors des tailles autorisées", () => {
    expect(parseMatrixText(textOf(["###", "#.#", "###"])).ok).toBe(false);

    const tooWide = Array.from({ length: 8 }, () => "#".repeat(60));
    expect(parseMatrixText(textOf(tooWide)).ok).toBe(false);
  });

  it("ferme un contour ouvert plutôt que de rejeter la carte, et le signale", () => {
    const openBorder = [...VALID];
    openBorder[3] = ".........";
    const result = parseMatrixText(textOf(openBorder));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.map.tiles[3]!.every((kind) => kind === "wall" || kind === "empty")).toBe(true);
      expect(result.map.tiles[3]![0]).toBe("wall");
      expect(result.map.tiles[3]![8]).toBe("wall");
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain("contour");
    }
  });

  it("refuse une matrice vide", () => {
    expect(parseMatrixText("   \n\n  ").ok).toBe(false);
  });
});

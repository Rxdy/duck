import { describe, expect, it } from "vitest";
import { FREE_MAP, roomName } from "./freeRoam.js";
import { createWorld, distance, isFloor } from "./tutorial.js";

describe("carte du mode libre", () => {
  const { rows } = FREE_MAP;

  it("est rectangulaire et fermée", () => {
    for (const row of rows) expect(row).toHaveLength(rows[0]!.length);
    for (const row of rows) expect(row[0] + row.at(-1)!).toBe("##");
    expect(rows[0]! + rows.at(-1)!).toMatch(/^#+$/);
  });

  it("relie toutes les cases au départ : aucune salle ni recoin inaccessible", () => {
    const start = createWorld(FREE_MAP).me;
    rows.forEach((row, y) => {
      [...row].forEach((_, x) => {
        if (isFloor(rows, x, y)) {
          expect(distance(rows, start, { x, y }), `${x},${y}`).toBeLessThan(Infinity);
        }
      });
    });
  });

  it("place un canard immobile à toucher et nomme les quatre salles", () => {
    expect(createWorld(FREE_MAP).rival).toMatchObject({ x: 20, y: 12 });
    const names = [
      roomName({ x: 3, y: 3 }),
      roomName({ x: 18, y: 3 }),
      roomName({ x: 3, y: 11 }),
      roomName({ x: 18, y: 11 }),
    ];
    expect(new Set(names).size).toBe(4);
  });
});

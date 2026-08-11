import { describe, expect, it } from "vitest";
import { removeMap, upsertMap } from "./savedMaps.js";
import { createEmptyMap } from "./mapEditor.js";

describe("upsertMap", () => {
  it("creates a new map with a generated id when no id is given", () => {
    const { maps, saved } = upsertMap([], { name: "Ma carte", map: createEmptyMap(5, 5) });
    expect(maps).toHaveLength(1);
    expect(saved.id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(saved.name).toBe("Ma carte");
    expect(saved.width).toBe(7); // 5 jouable + 2 (murs du contour, voir mapEditor.ts)
  });

  it("falls back to a default name when left blank", () => {
    const { saved } = upsertMap([], { name: "   ", map: createEmptyMap(5, 5) });
    expect(saved.name).toBe("Carte sans nom");
  });

  it("updates the existing entry in place when the id matches", () => {
    const first = upsertMap([], { name: "V1", map: createEmptyMap(5, 5) });
    const second = upsertMap(first.maps, {
      id: first.saved.id,
      name: "V2",
      map: createEmptyMap(7, 7),
    });

    expect(second.maps).toHaveLength(1);
    expect(second.saved.id).toBe(first.saved.id);
    expect(second.saved.name).toBe("V2");
    expect(second.saved.width).toBe(9); // 7 jouable + 2
  });

  it("adds a new entry rather than overwriting when the id matches nothing", () => {
    const first = upsertMap([], { name: "V1", map: createEmptyMap(5, 5) });
    const second = upsertMap(first.maps, {
      id: "unknown-id",
      name: "V2",
      map: createEmptyMap(7, 7),
    });

    expect(second.maps).toHaveLength(2);
  });
});

describe("removeMap", () => {
  it("removes only the matching map", () => {
    const a = upsertMap([], { name: "A", map: createEmptyMap(5, 5) });
    const b = upsertMap(a.maps, { name: "B", map: createEmptyMap(5, 5) });

    const result = removeMap(b.maps, a.saved.id);
    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe("B");
  });
});

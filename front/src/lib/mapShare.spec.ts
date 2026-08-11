import { describe, expect, it } from "vitest";
import { parseImportedMap } from "./mapShare.js";

const validRaw = {
  id: "original-id",
  name: "Carte partagée",
  width: 5,
  height: 3,
  tiles: [
    ["wall", "wall", "wall", "wall", "wall"],
    ["wall", "spawn-0", "empty", "spawn-1", "wall"],
    ["wall", "wall", "wall", "wall", "wall"],
  ],
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("parseImportedMap", () => {
  it("accepts a well-formed map and keeps its name/dimensions/tiles", () => {
    const result = parseImportedMap(validRaw);
    expect(result).toMatchObject({
      name: "Carte partagée",
      width: 5,
      height: 3,
      tiles: validRaw.tiles,
    });
  });

  it("ne reprend jamais l'identité de la carte d'origine", () => {
    // L'import crée une nouvelle carte sur le compte, dont l'id vient du
    // serveur : réimporter le même fichier ne peut donc rien écraser.
    expect(parseImportedMap(validRaw)).not.toHaveProperty("id");
  });

  it("rejects null, non-objects, or missing required fields", () => {
    expect(parseImportedMap(null)).toBeUndefined();
    expect(parseImportedMap("nope")).toBeUndefined();
    expect(parseImportedMap({ ...validRaw, name: undefined })).toBeUndefined();
    expect(parseImportedMap({ ...validRaw, width: "5" })).toBeUndefined();
    expect(parseImportedMap({ ...validRaw, tiles: "not an array" })).toBeUndefined();
  });

  it("sanitizes unknown tile values to empty instead of importing garbage", () => {
    const result = parseImportedMap({
      ...validRaw,
      tiles: [["wall", "lava-pit", "spawn-9"]],
    })!;
    expect(result.tiles[0]).toEqual(["wall", "empty", "empty"]);
  });

  it("falls back to a default name when the imported name is blank", () => {
    const result = parseImportedMap({ ...validRaw, name: "   " })!;
    expect(result.name).toBe("Carte importée");
  });
});

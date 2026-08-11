import { describe, expect, it } from "vitest";
import { isDirection, parseClientMessage } from "./clientMessage.js";

describe("parseClientMessage", () => {
  it("accepts the four real directions", () => {
    expect(parseClientMessage('{"type":"MOVE","direction":"UP"}')).toEqual({
      type: "MOVE",
      direction: "UP",
    });
    expect(parseClientMessage('{"type":"MOVE","direction":"RIGHT"}')).toEqual({
      type: "MOVE",
      direction: "RIGHT",
    });
  });

  // Le message qui faisait tomber le serveur entier, et avec lui les parties
  // de tous les autres joueurs connectés (voir clientMessage.ts).
  it("rejects a direction that does not exist", () => {
    expect(parseClientMessage('{"type":"MOVE","direction":"NE"}')).toBeNull();
    expect(parseClientMessage('{"type":"MOVE","direction":42}')).toBeNull();
    expect(parseClientMessage('{"type":"MOVE"}')).toBeNull();
  });

  it("rejects anything that is not a message", () => {
    expect(parseClientMessage("pas du json")).toBeNull();
    expect(parseClientMessage("null")).toBeNull();
    expect(parseClientMessage('"MOVE"')).toBeNull();
    expect(parseClientMessage("[]")).toBeNull();
    expect(parseClientMessage("{}")).toBeNull();
    expect(parseClientMessage('{"type":"SUPPRIME_TOUT"}')).toBeNull();
  });

  it("accepts PING", () => {
    expect(parseClientMessage('{"type":"PING"}')).toEqual({ type: "PING" });
  });

  describe("JOIN", () => {
    const valid = { type: "JOIN", gameId: "g1", name: "Deeps", anonId: "a1" };

    it("keeps the identity fields", () => {
      expect(parseClientMessage(JSON.stringify(valid))).toEqual(valid);
    });

    it("rejects a JOIN without a usable identity", () => {
      expect(parseClientMessage('{"type":"JOIN"}')).toBeNull();
      expect(parseClientMessage(JSON.stringify({ ...valid, name: 12 }))).toBeNull();
      expect(parseClientMessage(JSON.stringify({ ...valid, anonId: null }))).toBeNull();
    });

    it("keeps optional fields when they are valid", () => {
      expect(
        parseClientMessage(
          JSON.stringify({ ...valid, token: "t", mode: "ffa4", botLevel: "expert" }),
        ),
      ).toEqual({ ...valid, token: "t", mode: "ffa4", botLevel: "expert" });
    });

    // Un mode ou un niveau inconnu ne doit pas priver le joueur de sa partie :
    // index.ts retombe sur ses valeurs par défaut, comme pour un client ancien.
    it("drops optional fields that are bogus, without failing the JOIN", () => {
      expect(
        parseClientMessage(JSON.stringify({ ...valid, token: 7, mode: "ffa99", botLevel: "dieu" })),
      ).toEqual(valid);
    });
  });

  describe("JOIN_TEST", () => {
    const map = { width: 2, height: 1, tiles: [["Spawn", "Spawn"]], spawns: [{ x: 0, y: 0 }] };

    it("keeps a well-formed custom map", () => {
      expect(parseClientMessage(JSON.stringify({ type: "JOIN_TEST", map }))).toEqual({
        type: "JOIN_TEST",
        map,
      });
    });

    it("rejects a map whose shape would break buildMapFromWire", () => {
      expect(parseClientMessage('{"type":"JOIN_TEST"}')).toBeNull();
      expect(parseClientMessage(JSON.stringify({ type: "JOIN_TEST", map: {} }))).toBeNull();
      expect(
        parseClientMessage(JSON.stringify({ type: "JOIN_TEST", map: { ...map, tiles: "murs" } })),
      ).toBeNull();
      expect(
        parseClientMessage(JSON.stringify({ type: "JOIN_TEST", map: { ...map, spawns: 3 } })),
      ).toBeNull();
      expect(
        parseClientMessage(JSON.stringify({ type: "JOIN_TEST", map: { ...map, width: null } })),
      ).toBeNull();
    });
  });
});

describe("isDirection", () => {
  it("only recognises the four directions", () => {
    expect(["UP", "DOWN", "LEFT", "RIGHT"].every(isDirection)).toBe(true);
    expect(["NE", "up", "", null, undefined, 0, {}].some(isDirection)).toBe(false);
  });
});

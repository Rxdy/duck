import { describe, expect, it } from "vitest";
import { parseLobbyCode } from "./lobbyApi.js";

describe("parseLobbyCode", () => {
  it("accepte le code seul ou le lien du salon", () => {
    for (const text of [" a1b2c3 ", "#A1B2C3", "https://duck.rxdy.fr/salon/a1b2c3"]) {
      expect(parseLobbyCode(text)).toBe("A1B2C3");
    }
  });

  it("refuse le reste", () => {
    for (const text of ["", "a1b2c", "salut a1b2c3x", "https://duck.rxdy.fr/jouer"]) {
      expect(parseLobbyCode(text)).toBeUndefined();
    }
  });
});

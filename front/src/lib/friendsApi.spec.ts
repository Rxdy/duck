import { describe, expect, it } from "vitest";
import { isPlayerCode, requestMessage } from "./friendsApi.js";

describe("isPlayerCode", () => {
  it("reconnaît un code joueur seul, avec # ou collé au pseudo", () => {
    for (const term of ["a3f9c2 ", "#A3F9C2", "lea#a3f9c2"]) expect(isPlayerCode(term)).toBe(true);
    for (const term of ["lea", "a3f9c", "a3f9c21"]) expect(isPlayerCode(term)).toBe(false);
  });
});

describe("requestMessage", () => {
  it("dit ce qui s'est passé après une demande", () => {
    expect(requestMessage("sent", "lea")).toContain("envoyée à lea");
    expect(requestMessage("accepted", "lea")).toContain("ami avec lea");
    expect(requestMessage(undefined, "lea")).toContain("Réessaie");
  });
});

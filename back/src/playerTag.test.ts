import { describe, expect, it } from "vitest";
import { parseTag } from "./playerTag.js";

describe("parseTag", () => {
  it("lit le code seul, avec # ou collé au pseudo, quelle que soit la casse", () => {
    for (const text of [" a3f9c2 ", "#A3F9C2", "lea#a3f9c2"]) {
      expect(parseTag(text)).toBe("A3F9C2");
    }
  });

  it("refuse un pseudo, un email ou un code mal formé", () => {
    for (const text of ["lea", "lea@example.com", "A3F9C", "A3F9C21", "lea#GGGGGG"]) {
      expect(parseTag(text)).toBeUndefined();
    }
  });
});

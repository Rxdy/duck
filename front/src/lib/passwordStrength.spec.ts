import { describe, expect, it } from "vitest";
import {
  isPasswordAccepted,
  passwordEntropy,
  REQUIRED_BITS,
  REQUIRED_RATIO,
  strengthRatio,
} from "./passwordStrength.js";

describe("passwordEntropy", () => {
  it("vaut zéro sans mot de passe", () => {
    expect(passwordEntropy("")).toBe(0);
  });

  it("monte avec la longueur", () => {
    expect(passwordEntropy("xnvqbdrukm")).toBeGreaterThan(passwordEntropy("xnvqb"));
  });

  it("monte quand on élargit l'alphabet", () => {
    // Même longueur, mais quatre familles de caractères au lieu d'une.
    expect(passwordEntropy("Kw7$Rz2!")).toBeGreaterThan(passwordEntropy("kwrzkwrz"));
  });

  it("ne récompense pas les répétitions", () => {
    // Sinon "aaaaaaaaaaaa" passerait pour aussi solide que douze caractères
    // réellement variés.
    expect(passwordEntropy("aaaaaaaaaaaa")).toBeLessThan(passwordEntropy("xjqmvbzfkwpr"));
  });

  it("pénalise les suites connues", () => {
    // Une attaque qui essaie "abcdef" ou "123456" n'a rien à deviner.
    expect(passwordEntropy("abcdefgh")).toBeLessThan(passwordEntropy("xnvqbdru"));
    expect(passwordEntropy("12345678")).toBeLessThan(passwordEntropy("94718350"));
  });

  it("pénalise une suite écrite à l'envers", () => {
    expect(passwordEntropy("hgfedcba")).toBeLessThan(passwordEntropy("xnvqbdru"));
  });
});

describe("isPasswordAccepted", () => {
  it("n'impose ni longueur ni familles : seuls les bits comptent", () => {
    expect(isPasswordAccepted("Xb7!kmqzvw")).toBe(true);
    expect(isPasswordAccepted("truiteverteaubordduzinc")).toBe(true);
  });

  it("refuse ce qui est court, répétitif ou une suite", () => {
    for (const weak of ["", "abc", "azerty", "Aaaaaaaaa1!", "Abcdefgh1!", "canardjaune"]) {
      expect(isPasswordAccepted(weak), weak).toBe(false);
    }
  });
});

describe("strengthRatio", () => {
  it("passe le repère au minimum, puis continue de monter", () => {
    expect(strengthRatio("")).toBe(0);
    expect(strengthRatio("canardjaune")).toBeLessThan(REQUIRED_RATIO);
    expect(strengthRatio("Xb7!kmqzvw")).toBeGreaterThanOrEqual(REQUIRED_RATIO);
    expect(strengthRatio("Xb7!kmqzvw")).toBeLessThan(100);
    expect(strengthRatio("Xb7!kmqzvw-Truite&9")).toBeGreaterThan(strengthRatio("Xb7!kmqzvw"));
    expect(strengthRatio("Mon canard jaune adore le pain 7!")).toBe(100);
    expect(passwordEntropy("Xb7!kmqzvw")).toBeGreaterThanOrEqual(REQUIRED_BITS);
  });
});

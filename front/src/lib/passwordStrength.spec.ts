import { describe, expect, it } from "vitest";
import {
  ACCEPTED_LEVEL,
  FULL_BAR_BITS,
  isPasswordAccepted,
  meetsRequirements,
  MIN_LENGTH,
  passwordEntropy,
  requirementsOf,
  STRENGTH_LEVELS,
  strengthOf,
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

describe("requirementsOf", () => {
  it("liste le socle obligatoire, avec l'état de chacun", () => {
    // Un refus qui ne dit pas ce qui manque oblige le joueur à deviner.
    const clefs = requirementsOf("").map((r) => r.key);
    expect(clefs).toEqual(["length", "lower", "upper", "digit", "special"]);
  });

  it("repère précisément ce qui manque", () => {
    const manquants = (password: string) =>
      requirementsOf(password)
        .filter((r) => !r.met)
        .map((r) => r.key);

    expect(manquants("canardjaune")).toEqual(["upper", "digit", "special"]);
    expect(manquants("Canardjaune")).toEqual(["digit", "special"]);
    expect(manquants("Canardjaune7")).toEqual(["special"]);
    expect(manquants("Canardjaune7!")).toEqual([]);
    expect(manquants("Ca7!")).toContain("length");
  });

  it("exige dix caractères, pas huit", () => {
    // Le socle de quatre familles en dépense déjà quatre : à huit, il n'en
    // resterait que quatre pour faire la différence.
    expect(MIN_LENGTH).toBe(10);
    expect(meetsRequirements("Ab7!cdefg")).toBe(false);
    expect(meetsRequirements("Xb7!kmqzvw")).toBe(true);
  });
});

describe("STRENGTH_LEVELS", () => {
  it("propose huit paliers, du plus faible au plus fort", () => {
    expect(STRENGTH_LEVELS).toHaveLength(8);
    const seuils = STRENGTH_LEVELS.map((l) => l.from);
    expect(seuils).toEqual([...seuils].sort((a, b) => a - b));
    expect(STRENGTH_LEVELS.map((l) => l.index)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it("donne à chaque palier un libellé et une couleur distincts", () => {
    expect(new Set(STRENGTH_LEVELS.map((l) => l.label)).size).toBe(8);
    expect(new Set(STRENGTH_LEVELS.map((l) => l.color)).size).toBe(8);
  });

  it("cale le palier d'acceptation sur ce que le socle produit au minimum", () => {
    // Dix caractères puisant dans les quatre familles valent ~66 bits : si le
    // palier accepté était plus haut, le socle laisserait passer des mots de
    // passe que l'entropie refuserait systématiquement — et la règle des dix
    // caractères ne voudrait plus rien dire.
    expect(passwordEntropy("Xb7!kmqzvw")).toBeGreaterThanOrEqual(
      STRENGTH_LEVELS[ACCEPTED_LEVEL]!.from,
    );
  });
});

describe("strengthOf", () => {
  it("classe un mot de passe vide au plus bas", () => {
    expect(strengthOf("").index).toBe(0);
  });

  it("monte de palier quand le mot de passe s'améliore", () => {
    const faible = strengthOf("azerty");
    const moyen = strengthOf("Canard2024!");
    const fort = strengthOf("Truite-Verte-Sauvage-8412-Zk!");

    expect(faible.index).toBeLessThan(moyen.index);
    expect(moyen.index).toBeLessThan(fort.index);
  });
});

describe("isPasswordAccepted", () => {
  it("refuse ce qui ne remplit pas le socle", () => {
    for (const faible of ["", "abc", "azerty", "canardjaune", "Canardjaune7"]) {
      expect(isPasswordAccepted(faible), faible).toBe(false);
    }
  });

  it("refuse un mot de passe qui coche le socle mais ne vaut rien", () => {
    // Onze caractères, quatre familles... et neuf fois la même lettre. C'est
    // exactement ce que le socle seul laisserait passer.
    expect(meetsRequirements("Aaaaaaaaa1!")).toBe(true);
    expect(isPasswordAccepted("Aaaaaaaaa1!")).toBe(false);

    // Même chose pour une suite : le socle est coché, l'entropie non.
    expect(meetsRequirements("Abcdefgh1!")).toBe(true);
    expect(isPasswordAccepted("Abcdefgh1!")).toBe(false);
  });

  it("accepte un mot de passe raisonnable, sans exiger le haut de l'échelle", () => {
    expect(isPasswordAccepted("Canard2024!")).toBe(true);
    expect(strengthOf("Canard2024!").index).toBeLessThan(6);
  });
});

describe("strengthRatio", () => {
  it("progresse en continu, caractère par caractère", () => {
    // Une barre qui n'avance qu'au changement de palier laisse croire que
    // rallonger ne sert à rien entre deux crans.
    const court = strengthRatio("Canard2024!");
    const long = strengthRatio("Canard2024!x");
    expect(long).toBeGreaterThan(court);
    expect(strengthOf("Canard2024!").index).toBe(strengthOf("Canard2024!x").index);
  });

  it("est pleine au dernier palier, et ne déborde jamais", () => {
    expect(strengthRatio("")).toBe(0);
    expect(FULL_BAR_BITS).toBe(STRENGTH_LEVELS[STRENGTH_LEVELS.length - 1]!.from);
    expect(strengthRatio("Mon canard jaune adore le pain 7!")).toBe(100);
  });
});

import { describe, expect, it } from "vitest";
import * as catalog from "./accessories/accessoires.js";
import { createCoincoin } from "./coincoin.js";
import { dress } from "./outfit.js";
import { collection, randomOutfit, sameOutfit, wear } from "./wardrobe.js";

const { ACCESSOIRES } = catalog;
// Lu par Vite et non importé : l'image Docker du front se construit sans le dossier du serveur.
const serverLists = import.meta.glob<unknown>("../../../back/src/accessories.json", {
  eager: true,
  import: "default",
});

describe("catalogue des accessoires", () => {
  it("n'a aucun identifiant en double", () => {
    expect(new Set(ACCESSOIRES.map((a) => a.id)).size).toBe(ACCESSOIRES.length);
  });

  it("construit chaque pièce sur un canard", () => {
    const duck = createCoincoin("#FF4D6D");
    for (const item of ACCESSOIRES) {
      const worn = dress(duck, [item.id]);
      worn.setOpacity(0.6);
      worn.dispose();
    }
  });

  it("ne compose les thèmes qu'avec des pièces existantes, une par emplacement", () => {
    const themes = Object.entries(catalog)
      .filter(([name]) => name.startsWith("THEMES") || name === "TENUES")
      .flatMap(([, list]) => list as catalog.Outfit[]);
    for (const theme of themes) {
      const slots = theme.pieces.map((id) => ACCESSOIRES.find((a) => a.id === id)?.emplacement);
      expect(slots, theme.nom).not.toContain(undefined);
      expect(new Set(slots).size, theme.nom).toBe(slots.length);
    }
  });

  it("correspond à la liste du serveur (sinon : make accessories)", () => {
    const [server] = Object.values(serverLists);
    expect(server).toEqual(
      ACCESSOIRES.filter((a) => !a.reserve).map(({ id, emplacement }) => ({ id, emplacement })),
    );
  });

  it("ignore un identifiant inconnu au lieu de casser le rendu", () => {
    expect(() => dress(createCoincoin("#FF4D6D"), ["pas-au-catalogue"])).not.toThrow();
  });
});

describe("garde-robe", () => {
  it("remplace la pièce du même emplacement et garde les autres", () => {
    expect(wear(["casquette", "cape"], "tete", "couronne")).toEqual(["cape", "couronne"]);
    expect(wear(["casquette", "cape"], "tete", undefined)).toEqual(["cape"]);
  });

  it("montre tout le catalogue, ce qu'on possède d'abord, sans les affaires de Coincoin", () => {
    const all = collection(["cape", "couronne"], "all");

    expect(all.slice(0, 2).map((a) => a.owned)).toEqual([true, true]);
    expect(all.filter((a) => a.owned)).toHaveLength(2);
    expect(all).toHaveLength(ACCESSOIRES.filter((a) => !a.reserve).length);
    expect(all.map((a) => a.id)).not.toContain("sifflet");
  });

  it("se trie par emplacement", () => {
    const heads = collection(["cape", "couronne"], "tete");

    expect(heads.every((a) => a.emplacement === "tete")).toBe(true);
    expect(heads[0]!.id).toBe("couronne");
  });

  it("tire au hasard une pièce possédée par emplacement, et rien d'autre", () => {
    const owned = ["couronne", "casquette", "cape"];
    for (const draw of [0, 0.5, 0.999]) {
      const outfit = randomOutfit(owned, [], () => draw);
      expect(outfit).toHaveLength(2);
      expect(outfit).toContain("cape");
      for (const id of outfit) expect(owned).toContain(id);
    }
    expect(randomOutfit([])).toEqual([]);
  });

  it("change la tenue à chaque appui quand il y a le choix", () => {
    const owned = ["couronne", "casquette"];

    expect(randomOutfit(owned, ["couronne"], () => 0)).toEqual(["casquette"]);
    expect(randomOutfit(owned, ["casquette"], () => 0)).toEqual(["couronne"]);
  });

  it("montre au choix le débloqué ou ce qui reste à gagner, avec le tri par emplacement", () => {
    const owned = ["cape", "couronne"];

    expect(
      collection(owned, "all", "owned")
        .map((a) => a.id)
        .sort(),
    ).toEqual(owned);
    expect(collection(owned, "tete", "owned").map((a) => a.id)).toEqual(["couronne"]);
    expect(collection(owned, "all", "locked").every((a) => !a.owned)).toBe(true);
    expect(collection([], "all", "owned")).toEqual([]);
  });

  it("compare deux tenues sans tenir compte de l'ordre", () => {
    expect(sameOutfit(["cape", "couronne"], ["couronne", "cape"])).toBe(true);
    expect(sameOutfit(["cape"], [])).toBe(false);
  });
});

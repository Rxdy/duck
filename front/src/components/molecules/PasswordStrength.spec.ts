import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import PasswordStrength from "./PasswordStrength.vue";
import { STRENGTH_LEVELS } from "../../lib/passwordStrength.js";

function bar(password: string) {
  return mount(PasswordStrength, { props: { password } }).find("[role=progressbar]");
}

describe("PasswordStrength", () => {
  it("ne s'affiche pas tant que le champ est vide", () => {
    // Accueillir un formulaire vierge par "Beaucoup trop faible" en rouge
    // reproche au joueur de ne pas encore avoir tapé.
    expect(mount(PasswordStrength, { props: { password: "" } }).text()).toBe("");
  });

  it("remplit la barre en continu, pas par blocs", () => {
    const largeur = (password: string) =>
      bar(password)
        .find("div")
        .attributes("style")
        ?.match(/width:\s*([\d.]+)%/)?.[1];

    // Deux mots de passe du même palier doivent tout de même donner deux
    // largeurs différentes : c'est ce qui montre que rallonger paie.
    expect(Number(largeur("Canard2024!x"))).toBeGreaterThan(Number(largeur("Canard2024!")));
  });

  it("change de couleur en franchissant un palier", () => {
    const couleur = (password: string) => bar(password).find("div").classes();

    const faible = STRENGTH_LEVELS[1]!.color;
    const fort = STRENGTH_LEVELS[7]!.color;
    expect(couleur("canard")).toContain(faible);
    expect(couleur("Mon canard jaune adore le pain 7!")).toContain(fort);
  });

  it("nomme le palier et affiche l'entropie", () => {
    const wrapper = mount(PasswordStrength, { props: { password: "canard" } });
    expect(wrapper.text()).toContain("Très faible");
    expect(wrapper.text()).toMatch(/\d+ bits/);
  });

  it("liste le socle obligatoire tant qu'il n'est pas rempli", () => {
    // La barre note, la liste dit ce qui BLOQUE : un bouton grisé sans
    // explication laisse le joueur deviner.
    const incomplet = mount(PasswordStrength, { props: { password: "canardjaune" } });
    expect(incomplet.text()).toContain("une majuscule");
    expect(incomplet.text()).toContain("un chiffre");
    expect(incomplet.findAll("li")).toHaveLength(5);

    const complet = mount(PasswordStrength, { props: { password: "Canard2024!" } });
    expect(complet.findAll("li")).toHaveLength(0);
  });

  it("distingue visuellement les exigences déjà remplies", () => {
    const items = mount(PasswordStrength, { props: { password: "canardjaune" } }).findAll("li");
    // "une minuscule" est remplie, "une majuscule" non.
    expect(items[1]!.classes().join(" ")).toContain("emerald");
    expect(items[2]!.classes().join(" ")).not.toContain("emerald");
  });

  it("décrit la jauge autrement que par sa couleur", () => {
    // La couleur ne parvient pas à un lecteur d'écran : sans texte, la barre
    // n'apprend rien.
    const jauge = bar("canard");
    expect(jauge.attributes("aria-label")).toBe("Robustesse du mot de passe");
    expect(jauge.attributes("aria-valuetext")).toContain("Très faible");
    expect(Number(jauge.attributes("aria-valuenow"))).toBeGreaterThan(0);
  });
});

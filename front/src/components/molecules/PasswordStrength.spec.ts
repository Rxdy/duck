import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import PasswordStrength from "./PasswordStrength.vue";

const gauge = (password: string) => mount(PasswordStrength, { props: { password } });

describe("PasswordStrength", () => {
  it("ne s'affiche pas tant que le champ est vide", () => {
    expect(gauge("").text()).toBe("");
  });

  it("progresse avec les bits et dit quand c'est suffisant", () => {
    const weak = gauge("canard");
    expect(weak.text()).toContain("Trop faible");
    expect(weak.text()).toMatch(/\d+ bits · minimum 60/);

    const strong = gauge("Xb7!kmqzvw");
    expect(strong.text()).toContain("C'est bon");
    const width = (w: typeof strong) =>
      Number(
        w
          .get("[data-fill]")
          .attributes("style")!
          .match(/width: (\d+)%/)![1],
      );
    // Au-delà du minimum, la barre a encore de la marge et continue de monter.
    expect(width(strong)).toBeLessThan(100);
    expect(width(gauge("Xb7!kmqzvw-Truite&9"))).toBeGreaterThan(width(strong));
  });

  it("décrit la jauge autrement que par sa couleur", () => {
    const bar = gauge("canard").get("[role=progressbar]");
    expect(bar.attributes("aria-label")).toBe("Sécurité du mot de passe");
    expect(bar.attributes("aria-valuetext")).toContain("minimum 60");
  });
});

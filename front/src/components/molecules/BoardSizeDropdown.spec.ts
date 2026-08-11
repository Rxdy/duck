import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import BoardSizeDropdown from "./BoardSizeDropdown.vue";
import { CUSTOM_SIZE_ID, MAX_PLAYABLE_SIZE } from "../../lib/board.js";

function mountDropdown(props: Partial<Record<string, unknown>> = {}) {
  return mount(BoardSizeDropdown, {
    props: { modelValue: "duel-m", playableWidth: 15, playableHeight: 9, ...props },
  });
}

describe("BoardSizeDropdown", () => {
  it("lists every preset as an option, grouped by category", () => {
    const wrapper = mountDropdown();
    expect(wrapper.findAll("option").length).toBeGreaterThanOrEqual(6);
    expect(wrapper.findAll("optgroup").map((g) => g.attributes("label"))).toEqual([
      "Duel (1v1)",
      "Équipe / FFA",
    ]);
  });

  it("reflects the selected value", () => {
    const wrapper = mountDropdown({
      modelValue: "equipe-l",
      playableWidth: 20,
      playableHeight: 20,
    });
    expect((wrapper.get("select").element as HTMLSelectElement).value).toBe("equipe-l");
  });

  it("emits the chosen entry", async () => {
    const wrapper = mountDropdown();
    await wrapper.get("select").setValue("equipe-l");
    expect(wrapper.emitted("select")).toEqual([["equipe-l"]]);
  });

  it("cache les champs de taille tant qu'un preset est choisi", () => {
    // Le preset écrit déjà sa taille dans l'option ("M · 15×9") : répéter
    // l'information dans deux champs ne sert qu'à alourdir l'écran.
    expect(mountDropdown().findAll("input")).toHaveLength(0);
  });

  it("affiche les deux champs en mode sur mesure", () => {
    const wrapper = mountDropdown({ modelValue: CUSTOM_SIZE_ID });
    const inputs = wrapper.findAll("input");

    expect(inputs).toHaveLength(2);
    expect((inputs[0]!.element as HTMLInputElement).value).toBe("15");
    expect((inputs[1]!.element as HTMLInputElement).value).toBe("9");
  });

  it("propose toujours l'entrée sur mesure, même sur un preset", async () => {
    const wrapper = mountDropdown();
    await wrapper.get("select").setValue(CUSTOM_SIZE_ID);
    expect(wrapper.emitted("select")).toEqual([[CUSTOM_SIZE_ID]]);
  });

  it("emits a resize from the free width/height fields", async () => {
    const wrapper = mountDropdown({ modelValue: CUSTOM_SIZE_ID });
    const [width, height] = wrapper.findAll("input");

    await width!.setValue("22");
    await height!.setValue("7");

    expect(wrapper.emitted("resize")).toEqual([
      [22, 9],
      [15, 7],
    ]);
  });

  it("ramène une taille hors bornes dans les limites plutôt que de la refuser", async () => {
    const wrapper = mountDropdown({ modelValue: CUSTOM_SIZE_ID });
    await wrapper.findAll("input")[0]!.setValue("999");
    expect(wrapper.emitted("resize")).toEqual([[MAX_PLAYABLE_SIZE, 9]]);
  });
});

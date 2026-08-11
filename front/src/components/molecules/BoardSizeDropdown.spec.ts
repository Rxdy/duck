import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import BoardSizeDropdown from "./BoardSizeDropdown.vue";

describe("BoardSizeDropdown", () => {
  it("lists every preset as an option, grouped by category", () => {
    const wrapper = mount(BoardSizeDropdown, { props: { modelValue: "duel-m" } });
    expect(wrapper.findAll("option").length).toBeGreaterThanOrEqual(6);
    expect(wrapper.findAll("optgroup").map((g) => g.attributes("label"))).toEqual([
      "Duel (1v1)",
      "Équipe / FFA",
    ]);
  });

  it("reflects the selected value", () => {
    const wrapper = mount(BoardSizeDropdown, { props: { modelValue: "equipe-l" } });
    expect((wrapper.get("select").element as HTMLSelectElement).value).toBe("equipe-l");
  });

  it("emits update:modelValue when changed", async () => {
    const wrapper = mount(BoardSizeDropdown, { props: { modelValue: "duel-m" } });
    await wrapper.get("select").setValue("equipe-l");
    expect(wrapper.emitted("update:modelValue")).toEqual([["equipe-l"]]);
  });
});

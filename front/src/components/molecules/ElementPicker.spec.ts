import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import ElementPicker from "./ElementPicker.vue";
import { PLAYER_COLORS } from "../../theme.js";

describe("ElementPicker", () => {
  it("renders one swatch per player color plus the wall button", () => {
    const wrapper = mount(ElementPicker, { props: { modelValue: "wall" } });
    expect(wrapper.findAll("button")).toHaveLength(5);
  });

  it("colors each spawn swatch with its matching player color", () => {
    const wrapper = mount(ElementPicker, { props: { modelValue: "wall" } });
    const swatches = wrapper.findAll("button").slice(0, 4);
    swatches.forEach((swatch, index) => {
      expect(swatch.attributes("style")).toContain(toRgb(PLAYER_COLORS[index]!));
    });
  });

  it("highlights the active spawn color", () => {
    const wrapper = mount(ElementPicker, { props: { modelValue: "spawn-1" } });
    const buttons = wrapper.findAll("button");
    expect(buttons[1]!.classes()).toContain("border-white");
    expect(buttons[0]!.classes()).not.toContain("border-white");
  });

  it("emits update:modelValue with the clicked spawn color", async () => {
    const wrapper = mount(ElementPicker, { props: { modelValue: "wall" } });
    await wrapper.findAll("button")[2]!.trigger("click");
    expect(wrapper.emitted("update:modelValue")).toEqual([["spawn-2"]]);
  });

  it("emits update:modelValue('wall') when clicking the wall button", async () => {
    const wrapper = mount(ElementPicker, { props: { modelValue: "spawn-0" } });
    await wrapper.findAll("button")[4]!.trigger("click");
    expect(wrapper.emitted("update:modelValue")).toEqual([["wall"]]);
  });
});

// jsdom normalise les couleurs hex en rgb() dans l'attribut style.
function toRgb(hex: string): string {
  const value = hex.replace("#", "");
  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);
  return `rgb(${r}, ${g}, ${b})`;
}

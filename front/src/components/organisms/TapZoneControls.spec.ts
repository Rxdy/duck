import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import TapZoneControls from "./TapZoneControls.vue";

function mockRect(el: Element) {
  vi.spyOn(el, "getBoundingClientRect").mockReturnValue({
    left: 0,
    top: 0,
    width: 300,
    height: 600,
    right: 300,
    bottom: 600,
    x: 0,
    y: 0,
    toJSON() {
      return {};
    },
  });
}

// Centre du conteneur mocké : (150, 300).
describe("TapZoneControls", () => {
  it("emits UP for a tap in the upper-right quadrant", async () => {
    const wrapper = mount(TapZoneControls);
    mockRect(wrapper.element);
    await wrapper.trigger("click", { clientX: 220, clientY: 100 });
    expect(wrapper.emitted("move")).toEqual([["UP"]]);
  });

  it("emits RIGHT for a tap in the lower-right quadrant", async () => {
    const wrapper = mount(TapZoneControls);
    mockRect(wrapper.element);
    await wrapper.trigger("click", { clientX: 220, clientY: 500 });
    expect(wrapper.emitted("move")).toEqual([["RIGHT"]]);
  });

  it("emits DOWN for a tap in the lower-left quadrant", async () => {
    const wrapper = mount(TapZoneControls);
    mockRect(wrapper.element);
    await wrapper.trigger("click", { clientX: 80, clientY: 500 });
    expect(wrapper.emitted("move")).toEqual([["DOWN"]]);
  });

  it("emits LEFT for a tap in the upper-left quadrant", async () => {
    const wrapper = mount(TapZoneControls);
    mockRect(wrapper.element);
    await wrapper.trigger("click", { clientX: 80, clientY: 100 });
    expect(wrapper.emitted("move")).toEqual([["LEFT"]]);
  });

  it("never renders a visible button, keeping the board unobstructed", () => {
    const wrapper = mount(TapZoneControls);
    expect(wrapper.find("button").exists()).toBe(false);
  });
});

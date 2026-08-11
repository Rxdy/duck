import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import DuckAvatar from "./DuckAvatar.vue";

describe("DuckAvatar", () => {
  it("defaults to the round avatar style", () => {
    const wrapper = mount(DuckAvatar);
    const img = wrapper.get("img");
    // Version transparente : dans l'interface, un fond opaque ferait une
    // vignette sombre collée sur la page (voir scripts/generate-icons.py).
    expect(img.attributes("src")).toBe("/duck-mark.png");
    expect(img.classes()).toContain("h-7");
  });

  it("renders a bigger mark when variant is logo", () => {
    const wrapper = mount(DuckAvatar, { props: { variant: "logo" } });
    const img = wrapper.get("img");
    expect(img.classes()).toContain("h-8");
    expect(img.classes()).toContain("object-contain");
  });
});

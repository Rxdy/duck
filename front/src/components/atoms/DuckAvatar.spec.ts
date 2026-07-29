import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import DuckAvatar from "./DuckAvatar.vue";

describe("DuckAvatar", () => {
  it("defaults to the round avatar style", () => {
    const wrapper = mount(DuckAvatar);
    const img = wrapper.get("img");
    expect(img.attributes("src")).toBe("/duck.png");
    expect(img.classes()).toContain("rounded-full");
  });

  it("renders a square-ish logo style when variant is logo", () => {
    const wrapper = mount(DuckAvatar, { props: { variant: "logo" } });
    const img = wrapper.get("img");
    expect(img.classes()).toContain("rounded");
    expect(img.classes()).not.toContain("rounded-full");
  });
});

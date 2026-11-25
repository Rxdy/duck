import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter, RouterLink } from "vue-router";
import AppButton from "./AppButton.vue";

const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: "/", component: { template: "<div/>" } }],
});

describe("AppButton", () => {
  it("renders a button and emits click when enabled", async () => {
    const wrapper = mount(AppButton, { slots: { default: "Go" } });
    expect(wrapper.text()).toBe("Go");
    await wrapper.get("button").trigger("click");
    expect(wrapper.emitted("click")).toHaveLength(1);
  });

  it("does not emit click when disabled", async () => {
    const wrapper = mount(AppButton, { props: { disabled: true }, slots: { default: "Go" } });
    expect(wrapper.get("button").attributes("disabled")).toBeDefined();
    await wrapper.get("button").trigger("click");
    expect(wrapper.emitted("click")).toBeUndefined();
  });

  it("renders as a RouterLink when `to` is provided", () => {
    const wrapper = mount(AppButton, {
      props: { to: "/jouer" },
      slots: { default: "Jouer" },
      global: { plugins: [router] },
    });
    expect(wrapper.findComponent(RouterLink).exists()).toBe(true);
    expect(wrapper.findComponent(RouterLink).props("to")).toBe("/jouer");
  });
});

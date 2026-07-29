import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter, RouterLink } from "vue-router";
import AppHeader from "./AppHeader.vue";

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: "/", component: { template: "<div/>" } },
    { path: "/canard", component: { template: "<div/>" } },
  ],
});

describe("AppHeader", () => {
  it("links the logo home and the avatar button to /canard", () => {
    const wrapper = mount(AppHeader, { global: { plugins: [router] } });
    const links = wrapper.findAllComponents(RouterLink);
    expect(links.map((l) => l.props("to"))).toEqual(["/", "/canard"]);
  });

  it("has an accessible label on the duck profile button", () => {
    const wrapper = mount(AppHeader, { global: { plugins: [router] } });
    expect(wrapper.find('[aria-label="Mon canard"]').exists()).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter, RouterLink } from "vue-router";
import MenuCard from "./MenuCard.vue";

const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: "/jouer", component: { template: "<div/>" } }],
});

describe("MenuCard", () => {
  it("renders the label, description and links to the right route", () => {
    const wrapper = mount(MenuCard, {
      props: { to: "/jouer", label: "Jouer", description: "Rejoins une partie" },
      global: { plugins: [router] },
    });

    expect(wrapper.text()).toContain("Jouer");
    expect(wrapper.text()).toContain("Rejoins une partie");
    expect(wrapper.findComponent(RouterLink).props("to")).toBe("/jouer");
  });

  it("réserve l'accent à l'action principale", () => {
    const mountCard = (primary: boolean) =>
      mount(MenuCard, {
        props: { to: "/jouer", label: "Jouer", description: "", primary },
        global: { plugins: [router] },
      });

    expect(mountCard(true).get("a").classes()).toContain("bg-cyan-500");
    expect(mountCard(false).get("a").classes()).toContain("panel");
  });
});

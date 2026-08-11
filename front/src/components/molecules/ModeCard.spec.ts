import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter, RouterLink } from "vue-router";
import ModeCard from "./ModeCard.vue";

const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: "/jeu", component: { template: "<div/>" } }],
});

describe("ModeCard", () => {
  it("shows a Jouer link to /jeu when ready", () => {
    const wrapper = mount(ModeCard, {
      props: { label: "Duel", description: "2 joueurs", ready: true },
      global: { plugins: [router] },
    });

    expect(wrapper.text()).toContain("Duel");
    expect(wrapper.findComponent(RouterLink).exists()).toBe(true);
    expect(wrapper.findComponent(RouterLink).props("to")).toBe("/jeu");
    expect(wrapper.text()).not.toContain("Bientôt");
  });

  it("shows a disabled Bientôt badge and no link when not ready", () => {
    const wrapper = mount(ModeCard, {
      props: { label: "2v2", description: "4 joueurs", ready: false },
      global: { plugins: [router] },
    });

    expect(wrapper.text()).toContain("Bientôt");
    expect(wrapper.findComponent(RouterLink).exists()).toBe(false);
  });
});

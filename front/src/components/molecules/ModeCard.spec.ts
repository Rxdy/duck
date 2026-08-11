import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter, RouterLink } from "vue-router";
import ModeCard from "./ModeCard.vue";

const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: "/jeu", component: { template: "<div/>" } }],
});

describe("ModeCard", () => {
  it("shows a Jouer link carrying the mode when ready", () => {
    const wrapper = mount(ModeCard, {
      props: { label: "FFA 3 joueurs", description: "1v1v1", ready: true, to: "/jeu?mode=ffa3" },
      global: { plugins: [router] },
    });

    expect(wrapper.text()).toContain("FFA 3 joueurs");
    expect(wrapper.findComponent(RouterLink).exists()).toBe(true);
    // Le mode voyage dans l'URL : sans lui, tous les modes lanceraient un duel.
    expect(wrapper.findComponent(RouterLink).props("to")).toBe("/jeu?mode=ffa3");
    expect(wrapper.text()).not.toContain("Bientôt");
  });

  it("shows a disabled Bientôt badge and no link when not ready", () => {
    const wrapper = mount(ModeCard, {
      props: { label: "2v2", description: "4 joueurs", ready: false, to: "/jeu?mode=2v2" },
      global: { plugins: [router] },
    });

    expect(wrapper.text()).toContain("Bientôt");
    expect(wrapper.findComponent(RouterLink).exists()).toBe(false);
  });
});

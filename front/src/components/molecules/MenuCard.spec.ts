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
      props: { to: "/jouer", label: "Jouer", description: "Rejoins une partie", accent: "#FF4D6D" },
      global: { plugins: [router] },
    });

    expect(wrapper.text()).toContain("Jouer");
    expect(wrapper.text()).toContain("Rejoins une partie");
    expect(wrapper.findComponent(RouterLink).props("to")).toBe("/jouer");
  });

  it("applies the accent color to the left border", () => {
    const wrapper = mount(MenuCard, {
      props: { to: "/jouer", label: "Jouer", description: "", accent: "#00C2D1" },
      global: { plugins: [router] },
    });

    // jsdom normalise les couleurs hex en rgb() dans l'attribut style.
    expect(wrapper.get("a").attributes("style")).toContain("border-left-color: rgb(0, 194, 209)");
  });
});

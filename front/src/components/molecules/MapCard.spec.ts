import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { mount } from "@vue/test-utils";
import MapCard from "./MapCard.vue";
import type { SavedMap } from "../../lib/mapsApi.js";

const map: SavedMap = {
  id: "a",
  name: "Le grand couloir",
  width: 15,
  height: 11,
  tiles: [],
  spawnCount: 2,
  updatedAt: "2026-01-01",
};

beforeEach(() => {
  setActivePinia(createPinia());
});

describe("MapCard", () => {
  it("names the map and says what it can be played as", () => {
    const wrapper = mount(MapCard, { props: { map } });

    expect(wrapper.text()).toContain("Le grand couloir");
    expect(wrapper.text()).toContain("Duel");
  });

  it("shows the PLAYABLE size, borders excluded", () => {
    // The border walls were never placed by the player: counting them would
    // show a size they do not recognise as the one they chose.
    const wrapper = mount(MapCard, { props: { map } });

    expect(wrapper.text()).toContain("13×9");
  });

  it("stays readable when the browser cannot render 3D", () => {
    // No WebGL under the test DOM, which is exactly what a player on a
    // locked-down browser gets: a card without a picture, never a hole.
    const wrapper = mount(MapCard, { props: { map } });

    expect(wrapper.find("img").exists()).toBe(false);
    expect(wrapper.find(".ri-map-2-line").exists()).toBe(true);
  });

  it("opens its actions when tapped anywhere on the card", () => {
    // The whole card is the target: on a phone, a small dedicated handle is
    // the one thing a thumb misses.
    const wrapper = mount(MapCard, { props: { map } });
    wrapper.find("button").trigger("click");

    expect(wrapper.emitted("open")).toHaveLength(1);
  });
});

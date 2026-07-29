import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import ScoreHud from "./ScoreHud.vue";
import type { PlayerState } from "../../types.js";

function player(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    id: "p1",
    name: "Alice",
    color: "#FF4D6D",
    accessory: "none",
    x: 0,
    y: 0,
    spawnX: 0,
    spawnY: 0,
    score: 0,
    ...overrides,
  };
}

describe("ScoreHud", () => {
  it("renders no badge when there are no players", () => {
    const wrapper = mount(ScoreHud, { props: { players: [] } });
    expect(wrapper.find("[data-corner]").exists()).toBe(false);
  });

  it("shows each player's name and score", () => {
    const players = [
      player({ id: "p1", name: "Alice", score: 3 }),
      player({ id: "p2", name: "Bob", score: 7 }),
    ];
    const wrapper = mount(ScoreHud, { props: { players } });

    expect(wrapper.text()).toContain("Alice");
    expect(wrapper.text()).toContain("3");
    expect(wrapper.text()).toContain("Bob");
    expect(wrapper.text()).toContain("7");
  });

  it("places up to 4 players in 4 distinct corners, in join order", () => {
    const players = [0, 1, 2, 3].map((i) => player({ id: `p${i}`, name: `P${i}` }));
    const wrapper = mount(ScoreHud, { props: { players } });

    const badges = wrapper.findAll("[data-corner]");
    expect(badges.map((b) => b.attributes("data-corner"))).toEqual([
      "top-left",
      "top-right",
      "bottom-left",
      "bottom-right",
    ]);
  });

  it("never shows more than 4 badges even with more players", () => {
    const players = [0, 1, 2, 3, 4].map((i) => player({ id: `p${i}` }));
    const wrapper = mount(ScoreHud, { props: { players } });

    expect(wrapper.findAll("[data-corner]")).toHaveLength(4);
  });

  it("uses each player's own color for their badge", () => {
    const wrapper = mount(ScoreHud, {
      props: { players: [player({ color: "#00C2D1" })] },
    });

    const swatch = wrapper.get("[data-corner] span span");
    expect(swatch.attributes("style")).toContain("background-color: rgb(0, 194, 209)");
  });
});

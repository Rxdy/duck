import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import RankingPodium from "./RankingPodium.vue";

const players = ["Alpha", "Bravo", "Charlie"].map((username, i) => ({
  rank: i + 1,
  username,
  rating: 300 - i,
}));

describe("RankingPodium", () => {
  it("place les trois premiers sur leur marche", () => {
    const wrapper = mount(RankingPodium, { props: { players } });
    expect(wrapper.get('[data-place="1"]').text()).toContain("Alpha");
    expect(wrapper.get('[data-place="3"]').text()).toContain("Charlie");
  });

  it("accepte moins de trois joueurs", () => {
    const wrapper = mount(RankingPodium, { props: { players: players.slice(0, 1) } });
    expect(wrapper.findAll("li")).toHaveLength(1);
  });
});

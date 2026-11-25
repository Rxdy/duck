import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import MatchHistory from "./MatchHistory.vue";
import { DEFAULT_VISIBLE_MATCHES, type MatchRecap } from "../../lib/matchHistory.js";

function matches(count: number): MatchRecap[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `m-${index}`,
    mapName: "Carte",
    mode: "duel",
    durationMs: 60_000,
    playedAt: new Date(2026, 7, 8, 19, 0).toISOString(),
    players: [
      { name: `Joueur ${index}`, color: "#FF4D6D", score: 15, isWinner: true, isMe: true },
      { name: "Bob", color: "#00C2D1", score: 9, isWinner: false, isMe: false },
    ],
  }));
}

describe("MatchHistory", () => {
  it("n'affiche que les trois dernières parties par défaut", () => {
    const wrapper = mount(MatchHistory, { props: { matches: matches(10) } });
    expect(wrapper.findAll("article")).toHaveLength(DEFAULT_VISIBLE_MATCHES);
  });

  it("déroule tout au clic, et annonce combien il y en a", async () => {
    const wrapper = mount(MatchHistory, { props: { matches: matches(10) } });
    const bouton = wrapper.find("button");
    expect(bouton.text()).toContain("Voir toutes les parties (10)");

    await bouton.trigger("click");
    expect(wrapper.findAll("article")).toHaveLength(10);
    expect(wrapper.find("button").text()).toBe("Réduire");
  });

  it("fait défiler la liste déroulée au lieu d'allonger la page", async () => {
    // Sinon dix parties poussent le reste du compte hors de vue.
    const wrapper = mount(MatchHistory, { props: { matches: matches(10) } });
    await wrapper.find("button").trigger("click");

    const liste = wrapper.find("article").element.parentElement!;
    expect(liste.className).toContain("overflow-y-auto");
    expect(liste.className).toContain("max-h-[26rem]");
  });

  it("ne borne pas la hauteur tant que la liste est courte", () => {
    // Trois cartes flotteraient dans une zone à moitié vide.
    const wrapper = mount(MatchHistory, { props: { matches: matches(3) } });
    const liste = wrapper.find("article").element.parentElement!;
    expect(liste.className).not.toContain("overflow-y-auto");
  });

  it("cache le bouton quand tout tient déjà à l'écran", () => {
    const wrapper = mount(MatchHistory, { props: { matches: matches(3) } });
    expect(wrapper.find("button").exists()).toBe(false);
  });

  it("dit quoi faire quand aucune partie n'a été jouée", () => {
    // Une section vide sans explication ressemble à un bug.
    const wrapper = mount(MatchHistory, { props: { matches: [] } });
    expect(wrapper.text()).toContain("Aucune partie");
    expect(wrapper.findAll("article")).toHaveLength(0);
  });

  it("signale l'état déroulé aux technologies d'assistance", () => {
    const wrapper = mount(MatchHistory, { props: { matches: matches(10) } });
    expect(wrapper.find("button").attributes("aria-expanded")).toBe("false");
  });
});

import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import MatchCard from "./MatchCard.vue";
import type { MatchRecap } from "../../lib/matchHistory.js";

function match(overrides: Partial<MatchRecap> = {}): MatchRecap {
  return {
    id: "m-1",
    mapName: "Roseraie",
    mode: "ffa3",
    durationMs: 125_000,
    // Construit en heure locale : le rendu affiche l'heure du joueur.
    playedAt: new Date(2026, 7, 8, 19, 42).toISOString(),
    players: [
      { name: "Alice", color: "#FF4D6D", score: 15, isWinner: true, isMe: true },
      { name: "Bob", color: "#00C2D1", score: 9, isWinner: false, isMe: false },
      { name: "Carmen", color: "#FFC15E", score: 4, isWinner: false, isMe: false },
    ],
    ...overrides,
  };
}

describe("MatchCard", () => {
  it("montre le mode, l'heure et la durée", () => {
    const texte = mount(MatchCard, { props: { match: match() } }).text();
    expect(texte).toContain("FFA 3 joueurs");
    expect(texte).toContain("19:42");
    expect(texte).toContain("2 min 05 s");
  });

  it("liste tous les joueurs avec leur score final", () => {
    const items = mount(MatchCard, { props: { match: match() } }).findAll("li");
    expect(items).toHaveLength(3);
    expect(items[0]!.text()).toContain("Alice");
    expect(items[0]!.text()).toContain("15");
    expect(items[2]!.text()).toContain("Carmen");
    expect(items[2]!.text()).toContain("4");
  });

  it("distingue le joueur qui consulte de ses adversaires", () => {
    const items = mount(MatchCard, { props: { match: match() } }).findAll("li");
    expect(items[0]!.text()).toContain("(toi)");
    expect(items[1]!.text()).not.toContain("(toi)");
  });

  it("annonce l'issue de la partie", () => {
    expect(mount(MatchCard, { props: { match: match() } }).text()).toContain("Victoire");

    const perdue = match({
      players: [
        { name: "Bob", color: "#00C2D1", score: 15, isWinner: true, isMe: false },
        { name: "Alice", color: "#FF4D6D", score: 3, isWinner: false, isMe: true },
      ],
    });
    expect(mount(MatchCard, { props: { match: perdue } }).text()).toContain("Défaite");
  });

  it("reprend la couleur de chaque joueur en partie", () => {
    // C'est ce qui relie la ligne au canard qu'on a vu à l'écran.
    const puce = mount(MatchCard, { props: { match: match() } })
      .findAll("li")[0]!
      .find("span");
    expect(puce.attributes("style")).toContain("rgb(255, 77, 109)");
  });

  it("n'affiche pas le nom de la carte", () => {
    // Il ne dit rien de la partie qu'on cherche à retrouver.
    expect(mount(MatchCard, { props: { match: match() } }).text()).not.toContain("Roseraie");
  });

  it("supporte une partie enregistrée avant le mode et la durée", () => {
    const ancienne = match({ mode: null, durationMs: null });
    const texte = mount(MatchCard, { props: { match: ancienne } }).text();
    // L'effectif remplace le mode, et la durée absente se dit absente.
    expect(texte).toContain("Partie à 3");
    expect(texte).toContain("—");
  });
});

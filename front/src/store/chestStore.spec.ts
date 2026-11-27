import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";
import type { Chest } from "../lib/chestsApi.js";
import { useChestStore } from "./chestStore.js";

const chest: Chest = {
  id: "c",
  rarity: "cuivre",
  state: "unlocking",
  unlockMs: 300_000,
  remainingMs: 300_000,
};

describe("temps restant d'un coffre", () => {
  beforeEach(() => setActivePinia(createPinia()));

  it("décompte depuis la dernière lecture du serveur", () => {
    const store = useChestStore();
    store.readAt = 1000;
    expect(store.remaining(chest, 4000)).toBe(297_000);
  });

  it("ne dépasse jamais le temps donné par le serveur, même avec une horloge en retard", () => {
    const store = useChestStore();
    store.readAt = 5000;
    expect(store.remaining(chest, 3000)).toBe(300_000);
  });

  it("vaut zéro pour un coffre qui n'est pas en cours", () => {
    const store = useChestStore();
    expect(store.remaining({ ...chest, state: "waiting" }, 0)).toBe(0);
  });
});

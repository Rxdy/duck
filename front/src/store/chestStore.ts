import { defineStore } from "pinia";
import { fetchChests, openChest, unlockChest, type Chest } from "../lib/chestsApi.js";

/**
 * Les 4 places à coffres du compte. Le serveur fait foi pour le temps : on garde l'heure locale de la
 * dernière lecture pour décompter entre deux lectures, puis on relit quand un coffre devrait être prêt.
 */
export const useChestStore = defineStore("chests", {
  state: () => ({
    chests: [] as Chest[],
    /** performance.now() de la dernière lecture : les temps restants partent de là. */
    readAt: 0,
    loaded: false,
    message: "",
  }),
  actions: {
    async refresh(token: string | undefined) {
      if (!token) {
        this.chests = [];
        this.loaded = false;
        return;
      }
      const chests = await fetchChests(token);
      if (!chests) return;
      this.chests = chests;
      this.readAt = performance.now();
      this.loaded = true;
    },
    /** Temps restant affiché, décompté localement depuis la dernière lecture. */
    remaining(chest: Chest, now: number): number {
      if (chest.state !== "unlocking") return 0;
      // Une horloge en retard sur la dernière lecture ne rallonge jamais le temps donné par le serveur.
      const elapsed = Math.max(0, now - this.readAt);
      return Math.max(0, chest.remainingMs - elapsed);
    },
    async unlock(token: string, id: string) {
      const result = await unlockChest(token, id);
      this.message = result.ok
        ? ""
        : result.reason === "busy"
          ? "Un coffre est déjà en cours d'ouverture."
          : "Ouverture impossible, réessaie.";
      await this.refresh(token);
    },
    async open(token: string, id: string): Promise<string[] | undefined> {
      const result = await openChest(token, id);
      await this.refresh(token);
      if (!result.ok) {
        this.message = "Ce coffre n'est pas encore prêt.";
        return undefined;
      }
      this.message = "";
      return result.items;
    },
  },
});

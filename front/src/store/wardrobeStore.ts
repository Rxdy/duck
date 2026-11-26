import { defineStore } from "pinia";
import { fetchWardrobe, savePreset, wearOutfit, type Wardrobe } from "../lib/wardrobeApi.js";

/** La garde-robe du compte connecté : la page, l'en-tête et l'accueil montrent le même canard. */
export const useWardrobeStore = defineStore("wardrobe", {
  state: () => ({ wardrobe: null as Wardrobe | null, loading: false }),
  getters: {
    outfit: (state): string[] => state.wardrobe?.outfit ?? [],
  },
  actions: {
    async refresh(token: string | undefined) {
      if (!token) {
        this.wardrobe = null;
        return;
      }
      this.loading = true;
      this.wardrobe = (await fetchWardrobe(token)) ?? null;
      this.loading = false;
    },
    async wear(token: string, outfit: string[]): Promise<boolean> {
      const done = await wearOutfit(token, outfit);
      if (done && this.wardrobe) this.wardrobe = { ...this.wardrobe, outfit };
      return done;
    },
    async save(token: string, preset: number, outfit: string[]): Promise<boolean> {
      const saved = await savePreset(token, preset, outfit);
      if (saved && this.wardrobe) {
        const presets = this.wardrobe.presets.map((p, i) => (i === preset ? outfit : p));
        this.wardrobe = { ...this.wardrobe, presets };
      }
      return saved;
    },
  },
});

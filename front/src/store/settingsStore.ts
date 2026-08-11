import { defineStore } from "pinia";
import type { Direction } from "../types.js";
import {
  DEFAULT_KEY_BINDINGS,
  loadSettings,
  persistSettings,
  type Settings,
  type Theme,
} from "../lib/settings.js";

/**
 * Le thème se joue sur un attribut de <html>, pas sur une classe de composant :
 * les deux palettes sont des variables CSS (voir src/style.css), donc tout
 * l'écran bascule d'un coup, y compris ce qui est rendu hors de l'application
 * Vue (fond de page pendant le chargement).
 */
function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
}

export const useSettingsStore = defineStore("settings", {
  state: (): Settings => loadSettings(),
  actions: {
    setMusicVolume(value: number) {
      this.musicVolume = value;
      this.persist();
    },
    setSfxVolume(value: number) {
      this.sfxVolume = value;
      this.persist();
    },
    setKeyBinding(direction: Direction, code: string) {
      this.keyBindings[direction] = code;
      this.persist();
    },
    resetKeyBindings() {
      this.keyBindings = { ...DEFAULT_KEY_BINDINGS };
      this.persist();
    },
    setHapticsEnabled(value: boolean) {
      this.hapticsEnabled = value;
      this.persist();
    },
    setReducedMotion(value: boolean) {
      this.reducedMotion = value;
      this.persist();
    },
    setColorblindMode(value: boolean) {
      this.colorblindMode = value;
      this.persist();
    },
    setTheme(value: Theme) {
      this.theme = value;
      applyTheme(value);
      this.persist();
    },
    /**
     * À appeler une fois au démarrage : les réglages sont lus depuis le
     * stockage local, mais rien ne les a encore transmis au document.
     */
    applyStoredTheme() {
      applyTheme(this.theme);
    },
    persist() {
      persistSettings(this.$state);
    },
  },
});

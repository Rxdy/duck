import { defineStore } from "pinia";
import type { Direction } from "../types.js";
import {
  DEFAULT_KEY_BINDINGS,
  loadSettings,
  persistSettings,
  type Settings,
} from "../lib/settings.js";

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
    persist() {
      persistSettings(this.$state);
    },
  },
});

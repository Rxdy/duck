<script setup lang="ts">
import { ref } from "vue";
import type { Direction } from "../types.js";
import { labelForKeyCode } from "../lib/keyboard.js";
import type { Theme } from "../lib/settings.js";
import { useSettingsStore } from "../store/settingsStore.js";
import { useDeviceType } from "../composables/useDeviceType.js";

const settings = useSettingsStore();
const { isTouchDevice } = useDeviceType();

const hapticsSupported = typeof navigator !== "undefined" && "vibrate" in navigator;

const THEMES: { value: Theme; label: string; icon: string }[] = [
  { value: "dark", label: "Sombre", icon: "ri-moon-line" },
  { value: "light", label: "Clair", icon: "ri-sun-line" },
];

const DIRECTION_LABELS: { direction: Direction; label: string }[] = [
  { direction: "UP", label: "Haut" },
  { direction: "DOWN", label: "Bas" },
  { direction: "LEFT", label: "Gauche" },
  { direction: "RIGHT", label: "Droite" },
];

// Direction en cours de réaffectation : la prochaine touche pressée lui sera
// assignée. `null` = aucun rebind en cours.
const listeningFor = ref<Direction | null>(null);

function startListening(direction: Direction) {
  listeningFor.value = direction;
  window.addEventListener("keydown", captureKey, { once: true });
}

function captureKey(event: KeyboardEvent) {
  event.preventDefault();
  if (listeningFor.value && event.code !== "Escape") {
    settings.setKeyBinding(listeningFor.value, event.code);
  }
  listeningFor.value = null;
}
</script>

<template>
  <div class="mx-auto flex h-full max-w-md flex-col gap-6 overflow-y-auto px-4 py-6">
    <h1 class="text-2xl font-bold">Options</h1>

    <section class="flex flex-col gap-4 rounded-xl bg-surface p-4">
      <h2 class="text-sm font-semibold text-ink/70">Audio</h2>

      <label class="flex flex-col gap-1 text-sm">
        <span class="flex justify-between text-ink/60">
          <span>Musique d'ambiance</span>
          <span>{{ settings.musicVolume }}%</span>
        </span>
        <input
          type="range"
          min="0"
          max="100"
          class="accent-cyan-500"
          :value="settings.musicVolume"
          @input="settings.setMusicVolume(Number(($event.target as HTMLInputElement).value))"
        />
      </label>

      <label class="flex flex-col gap-1 text-sm">
        <span class="flex justify-between text-ink/60">
          <span>Effets sonores</span>
          <span>{{ settings.sfxVolume }}%</span>
        </span>
        <input
          type="range"
          min="0"
          max="100"
          class="accent-cyan-500"
          :value="settings.sfxVolume"
          @input="settings.setSfxVolume(Number(($event.target as HTMLInputElement).value))"
        />
      </label>
    </section>

    <section v-if="!isTouchDevice" class="flex flex-col gap-3 rounded-xl bg-surface p-4">
      <h2 class="text-sm font-semibold text-ink/70">Contrôles clavier</h2>

      <div
        v-for="{ direction, label } in DIRECTION_LABELS"
        :key="direction"
        class="flex items-center justify-between text-sm"
      >
        <span class="text-ink/60">{{ label }}</span>
        <button
          type="button"
          class="min-w-16 rounded-lg px-3 py-1.5 font-mono text-sm transition"
          :class="
            listeningFor === direction ? 'bg-cyan-500 text-slate-950' : 'bg-ink/10 text-ink/80'
          "
          @click="startListening(direction)"
        >
          {{
            listeningFor === direction ? "..." : labelForKeyCode(settings.keyBindings[direction])
          }}
        </button>
      </div>

      <button
        type="button"
        class="self-start text-xs text-ink/40 underline underline-offset-2"
        @click="settings.resetKeyBindings()"
      >
        Réinitialiser
      </button>
    </section>

    <section
      v-if="isTouchDevice && hapticsSupported"
      class="flex flex-col gap-3 rounded-xl bg-surface p-4"
    >
      <h2 class="text-sm font-semibold text-ink/70">Contrôles tactiles</h2>

      <label class="flex items-center justify-between text-sm">
        <span class="text-ink/60">Vibration au toucher</span>
        <input
          type="checkbox"
          class="h-5 w-5 accent-cyan-500"
          :checked="settings.hapticsEnabled"
          @change="settings.setHapticsEnabled(($event.target as HTMLInputElement).checked)"
        />
      </label>
    </section>

    <section class="flex flex-col gap-3 rounded-xl bg-surface p-4">
      <h2 class="text-sm font-semibold text-ink/70">Apparence</h2>

      <div class="flex items-center justify-between gap-3 text-sm">
        <span class="text-ink/60">Thème</span>
        <div class="flex overflow-hidden rounded-lg border border-ink/10">
          <button
            v-for="option in THEMES"
            :key="option.value"
            type="button"
            class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition"
            :class="
              settings.theme === option.value
                ? 'bg-cyan-500 text-slate-950'
                : 'bg-surface text-ink/60'
            "
            :aria-pressed="settings.theme === option.value"
            @click="settings.setTheme(option.value)"
          >
            <i :class="option.icon" aria-hidden="true" />
            {{ option.label }}
          </button>
        </div>
      </div>
    </section>

    <section class="flex flex-col gap-3 rounded-xl bg-surface p-4">
      <h2 class="text-sm font-semibold text-ink/70">Accessibilité</h2>

      <label class="flex items-center justify-between text-sm">
        <span class="text-ink/60">Réduire les animations</span>
        <input
          type="checkbox"
          class="h-5 w-5 accent-cyan-500"
          :checked="settings.reducedMotion"
          @change="settings.setReducedMotion(($event.target as HTMLInputElement).checked)"
        />
      </label>

      <label class="flex items-center justify-between text-sm">
        <span class="text-ink/60">Palette daltonien</span>
        <input
          type="checkbox"
          class="h-5 w-5 accent-cyan-500"
          :checked="settings.colorblindMode"
          @change="settings.setColorblindMode(($event.target as HTMLInputElement).checked)"
        />
      </label>
    </section>
  </div>
</template>

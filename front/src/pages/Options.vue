<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import SegmentedChoice from "../components/atoms/SegmentedChoice.vue";
import type { Direction } from "../types.js";
import { labelForKeyCode } from "../lib/keyboard.js";
import { useSettingsStore } from "../store/settingsStore.js";
import { useDeviceType } from "../composables/useDeviceType.js";

const settings = useSettingsStore();
const { isTouchDevice } = useDeviceType();

const hapticsSupported = typeof navigator !== "undefined" && "vibrate" in navigator;

const TOUCH_CONTROLS = [
  { value: "boutons", label: "Boutons" },
  { value: "zones", label: "Zones" },
] as const;

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

/**
 * Comme les réglages d'un téléphone : un menu qui résume tout d'un coup d'œil,
 * et une page courte par section, sans défilement.
 */
const route = useRoute();

const onOff = (value: boolean) => (value ? "activé" : "désactivé");
const labelOf = (list: readonly { value: string; label: string }[], value: string) =>
  list.find((option) => option.value === value)?.label ?? value;

const sections = computed(() => [
  {
    key: "son",
    title: "Son",
    icon: "ri-volume-up-fill",
    summary: `Musique ${settings.musicVolume}% · Effets ${settings.sfxVolume}%`,
  },
  {
    key: "commandes",
    title: "Commandes",
    icon: "ri-gamepad-fill",
    summary: isTouchDevice.value
      ? `${labelOf(TOUCH_CONTROLS, settings.touchControls)}${
          hapticsSupported ? ` · Vibration ${onOff(settings.hapticsEnabled)}` : ""
        }`
      : DIRECTION_LABELS.map((d) => labelForKeyCode(settings.keyBindings[d.direction])).join(" "),
  },
  {
    key: "accessibilite",
    title: "Accessibilité",
    icon: "ri-eye-fill",
    summary: `Animations réduites : ${onOff(settings.reducedMotion)} · Daltonien : ${onOff(settings.colorblindMode)}`,
  },
]);

const current = computed(() => sections.value.find((s) => s.key === route.params.section));
</script>

<template>
  <div
    class="mx-auto flex h-full max-w-md flex-col gap-3 overflow-y-auto px-4 py-4 short:max-w-2xl short:py-2"
  >
    <template v-if="!current">
      <h1 class="text-2xl font-bold">Options</h1>

      <nav class="grid grid-cols-1 gap-3 short:grid-cols-2">
        <RouterLink
          v-for="section in sections"
          :key="section.key"
          :to="`/options/${section.key}`"
          class="panel flex items-center gap-3 rounded-2xl p-4 transition active:scale-[0.98] short:p-3"
        >
          <i class="accent-icon text-2xl" :class="section.icon" aria-hidden="true" />
          <span class="min-w-0 flex-1">
            <span class="block font-bold">{{ section.title }}</span>
            <span class="block truncate text-xs text-ink/60">{{ section.summary }}</span>
          </span>
          <i class="ri-arrow-right-s-line text-xl text-ink/40" aria-hidden="true" />
        </RouterLink>
      </nav>
    </template>

    <template v-else>
      <div class="flex items-center gap-3">
        <RouterLink
          to="/options"
          aria-label="Retour aux options"
          class="flex h-9 w-9 items-center justify-center rounded-lg border border-ink/10 bg-surface/80"
        >
          <i class="ri-arrow-left-line" aria-hidden="true" />
        </RouterLink>
        <h1 class="text-2xl font-bold">{{ current.title }}</h1>
      </div>

      <section class="panel flex flex-col gap-4 rounded-2xl p-4 short:gap-2 short:p-3">
        <template v-if="current.key === 'son'">
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
        </template>

        <template v-else-if="current.key === 'commandes'">
          <template v-if="isTouchDevice">
            <SegmentedChoice
              label="Se déplacer avec"
              :options="TOUCH_CONTROLS"
              :model-value="settings.touchControls"
              @update:model-value="settings.setTouchControls($event)"
            />
            <p class="text-xs text-ink/50">
              {{
                settings.touchControls === "boutons"
                  ? "Quatre boutons sous le plateau : ton doigt ne le cache jamais."
                  : "Touche du côté de ton canard où tu veux aller."
              }}
            </p>
            <label v-if="hapticsSupported" class="flex items-center justify-between text-sm">
              <span class="text-ink/70">Vibration au toucher</span>
              <input
                type="checkbox"
                class="h-5 w-5 accent-cyan-500"
                :checked="settings.hapticsEnabled"
                @change="settings.setHapticsEnabled(($event.target as HTMLInputElement).checked)"
              />
            </label>
          </template>
          <template v-else>
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
                  listeningFor === direction
                    ? 'bg-cyan-500 text-slate-950'
                    : 'bg-ink/10 text-ink/80'
                "
                @click="startListening(direction)"
              >
                {{
                  listeningFor === direction
                    ? "..."
                    : labelForKeyCode(settings.keyBindings[direction])
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
          </template>
        </template>

        <template v-else>
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
        </template>
      </section>
    </template>
  </div>
</template>

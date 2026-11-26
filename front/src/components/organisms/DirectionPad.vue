<script setup lang="ts">
import type { Direction } from "../../types.js";
import { createChordGuard } from "../../lib/chordGuard.js";

const props = withDefaults(
  // `hint` : le bouton à allumer, les autres s'effacent (camp d'entraînement).
  defineProps<{ hapticsEnabled?: boolean; hint?: Direction }>(),
  { hapticsEnabled: false, hint: undefined },
);
const emit = defineEmits<{ move: [direction: Direction] }>();

// Rangés comme les sens qu'ils donnent À L'ÉCRAN (le plateau est vu en
// diagonale). Couché, ils se partagent les deux pouces : gauche et droite.
const BUTTONS: { direction: Direction; icon: string; label: string; place: string }[] = [
  {
    direction: "LEFT",
    icon: "ri-arrow-left-up-line",
    label: "Aller en haut à gauche",
    place: "short:col-start-1 short:row-start-1",
  },
  {
    direction: "UP",
    icon: "ri-arrow-right-up-line",
    label: "Aller en haut à droite",
    place: "short:col-start-3 short:row-start-1",
  },
  {
    direction: "DOWN",
    icon: "ri-arrow-left-down-line",
    label: "Aller en bas à gauche",
    place: "short:col-start-1 short:row-start-2",
  },
  {
    direction: "RIGHT",
    icon: "ri-arrow-right-down-line",
    label: "Aller en bas à droite",
    place: "short:col-start-3 short:row-start-2",
  },
];

// Au contact et non au relâchement : chaque milliseconde compte en partie.
const guard = createChordGuard();
function press(direction: Direction, pointer?: number) {
  // Deux doigts ensemble ne font pas une diagonale.
  if (pointer !== undefined && !guard.press(pointer, performance.now())) return;
  emit("move", direction);
  if (props.hapticsEnabled) navigator.vibrate?.(15);
}
</script>

<template>
  <button
    v-for="button in BUTTONS"
    :key="button.direction"
    type="button"
    :data-direction="button.direction"
    :aria-label="button.label"
    class="flex h-20 touch-none select-none items-center justify-center panel rounded-2xl text-4xl text-ink/80 active:scale-95 active:!bg-cyan-500 active:text-slate-950 short:h-auto"
    :class="[button.place, hint === button.direction ? 'pad-hint' : hint ? 'opacity-40' : '']"
    @pointerdown.prevent="press(button.direction, $event.pointerId)"
    @pointerup="guard.release($event.pointerId)"
    @pointercancel="guard.release($event.pointerId)"
    @pointerleave="guard.release($event.pointerId)"
    @contextmenu.prevent
    @keydown.enter="press(button.direction)"
  >
    <i :class="button.icon" aria-hidden="true" />
  </button>
</template>

<style scoped>
.pad-hint {
  border-color: #ffe23a;
  box-shadow: 0 0 8px rgb(255 226 58 / 0.5);
  animation: pad-pulse 1s ease-in-out infinite;
}

@keyframes pad-pulse {
  50% {
    box-shadow: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .pad-hint {
    animation: none;
  }
}
</style>

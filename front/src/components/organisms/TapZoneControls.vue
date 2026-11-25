<script setup lang="ts">
import { ref } from "vue";
import type { Direction } from "../../types.js";
import { isTouchScreen } from "../../lib/pointer.js";
import { directionForTap, SCREEN_CENTER, type ScreenPoint } from "../../lib/touchZones.js";

const props = withDefaults(
  defineProps<{
    hapticsEnabled?: boolean;
    reducedMotion?: boolean;
    // Position à l'écran du canard joué : les quatre zones se rejoignent sur lui.
    anchor?: ScreenPoint;
  }>(),
  { hapticsEnabled: false, reducedMotion: false, anchor: () => SCREEN_CENTER },
);

// Repère visuel des quatre quarts de lib/touchZones.ts : la flèche montre le
// sens que prendra le canard À L'ÉCRAN (le plateau est vu en diagonale).
// Seulement au doigt : à la souris, on joue au clavier.
const showZones = isTouchScreen();
const ZONES: { direction: Direction; icon: string; right: boolean; bottom: boolean }[] = [
  { direction: "LEFT", icon: "ri-arrow-left-up-line", right: false, bottom: false },
  { direction: "UP", icon: "ri-arrow-right-up-line", right: true, bottom: false },
  { direction: "DOWN", icon: "ri-arrow-left-down-line", right: false, bottom: true },
  { direction: "RIGHT", icon: "ri-arrow-right-down-line", right: true, bottom: true },
];

const percent = (v: number) => `${Math.min(100, Math.max(0, v * 100))}%`;

/** Chaque zone va du canard jusqu'à son coin de l'écran. */
function zoneStyle(zone: { right: boolean; bottom: boolean }) {
  const { x, y } = props.anchor;
  return {
    left: zone.right ? percent(x) : "0%",
    width: percent(zone.right ? 1 - x : x),
    top: zone.bottom ? percent(y) : "0%",
    height: percent(zone.bottom ? 1 - y : y),
  };
}

const emit = defineEmits<{ move: [direction: Direction] }>();

interface Ripple {
  id: number;
  x: number;
  y: number;
}

const ripples = ref<Ripple[]>([]);
let nextRippleId = 0;

function handleTap(event: MouseEvent) {
  const target = event.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  const relX = (event.clientX - rect.left) / rect.width;
  const relY = (event.clientY - rect.top) / rect.height;

  emit("move", directionForTap(relX, relY, props.anchor));

  if (props.hapticsEnabled) navigator.vibrate?.(15);
  if (props.reducedMotion) return;

  const id = nextRippleId++;
  ripples.value = [
    ...ripples.value,
    { id, x: event.clientX - rect.left, y: event.clientY - rect.top },
  ];
  setTimeout(() => {
    ripples.value = ripples.value.filter((r) => r.id !== id);
  }, 400);
}
</script>

<template>
  <div class="absolute inset-0 touch-manipulation select-none" @click="handleTap">
    <template v-if="showZones">
      <div
        v-for="zone in ZONES"
        :key="zone.direction"
        :data-zone="zone.direction"
        aria-hidden="true"
        class="pointer-events-none absolute flex items-center overflow-hidden"
        :class="zone.right ? 'justify-end' : 'justify-start'"
        :style="zoneStyle(zone)"
      >
        <div class="absolute inset-1 rounded-2xl border border-dashed border-ink/25" />
        <i :class="zone.icon" class="px-3 text-4xl text-ink/35" />
      </div>
    </template>
    <span
      v-for="ripple in ripples"
      :key="ripple.id"
      class="tap-ripple pointer-events-none absolute h-12 w-12 rounded-full bg-ink/40"
      :style="{ left: `${ripple.x}px`, top: `${ripple.y}px` }"
    />
  </div>
</template>

<style scoped>
.tap-ripple {
  transform: translate(-50%, -50%) scale(0.4);
  animation: tap-fade 0.4s ease-out forwards;
}

@keyframes tap-fade {
  from {
    opacity: 0.5;
    transform: translate(-50%, -50%) scale(0.4);
  }
  to {
    opacity: 0;
    transform: translate(-50%, -50%) scale(1.6);
  }
}
</style>

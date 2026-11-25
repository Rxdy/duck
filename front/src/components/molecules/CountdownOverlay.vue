<script setup lang="ts">
import type { ScreenPoint } from "../../lib/touchZones.js";

/**
 * Le décompte de départ. Il démarre au centre, sur la carte entière, puis vient
 * se poser au-dessus du canard (`anchor`) pendant que la caméra se rapproche : le
 * regard est amené jusqu'à lui.
 */
const props = defineProps<{ label?: string; anchor?: ScreenPoint; onDuck: boolean }>();

const percent = (v: number) => `${Math.min(88, Math.max(12, v * 100))}%`;

function position() {
  if (!props.onDuck || !props.anchor) return { left: "50%", top: "42%" };
  return { left: percent(props.anchor.x), top: percent(props.anchor.y - 0.13) };
}
</script>

<template>
  <div v-if="label" class="pointer-events-none absolute inset-0 z-20 overflow-hidden">
    <span
      role="status"
      class="countdown absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-extrabold text-ink"
      :class="label.length > 1 ? 'text-4xl' : 'text-7xl'"
      :style="position()"
    >
      {{ label }}
    </span>
  </div>
</template>

<style scoped>
.countdown {
  text-shadow: 0 2px 10px rgb(0 0 0 / 0.8);
  transition:
    left 0.7s ease-in-out,
    top 0.7s ease-in-out;
}

@media (prefers-reduced-motion: reduce) {
  .countdown {
    transition: none;
  }
}
</style>

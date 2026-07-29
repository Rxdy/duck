<script setup lang="ts">
import { ref } from "vue";
import type { Direction } from "../../types.js";
import { directionForTap } from "../../lib/touchZones.js";

const props = withDefaults(defineProps<{ hapticsEnabled?: boolean; reducedMotion?: boolean }>(), {
  hapticsEnabled: false,
  reducedMotion: false,
});

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

  emit("move", directionForTap(relX, relY));

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
  <div class="absolute inset-0" @click="handleTap">
    <span
      v-for="ripple in ripples"
      :key="ripple.id"
      class="tap-ripple pointer-events-none absolute h-12 w-12 rounded-full bg-white/40"
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

<script setup lang="ts">
import { onMounted, onUnmounted, shallowRef, watch } from "vue";
import type { Direction } from "../../types.js";
import { createDuckMotion } from "../../composables/useDuckMotion.js";
import { antennaColor, createCoincoin, type Coincoin } from "../../lib/coincoin.js";
import { useSettingsStore } from "../../store/settingsStore.js";

const props = withDefaults(
  defineProps<{
    color: string;
    /** Case occupée, telle que donnée par le serveur. */
    x: number;
    y: number;
    /** Dernier côté demandé, même si un mur a empêché d'avancer. */
    facing?: Direction;
    // Millisecondes d'intouchabilité restantes (voir back/src/game-engine/
    // game.ts) : le canard clignote tant qu'elles s'écoulent.
    immuneForMs?: number;
  }>(),
  { immuneForMs: 0 },
);

/** Un peu réduit pour que le bec reste dans sa case. */
const SCALE = 0.85;
const FACING_STEP: Record<Direction, [number, number]> = {
  UP: [0, -1],
  DOWN: [0, 1],
  LEFT: [-1, 0],
  RIGHT: [1, 0],
};
// Clignotement d'immunité volontairement discret : une pulsation lente, pas un stroboscope.
const PULSES_PER_SECOND = 2.5;
const MIN_OPACITY = 0.6;

const settings = useSettingsStore();
const motion = createDuckMotion(props.x, props.y);
if (props.facing) motion.face(...FACING_STEP[props.facing], 0, true);
const duck = shallowRef<Coincoin>(build());
let immuneUntil = 0;
let frame: number | undefined;

function build(): Coincoin {
  const next = createCoincoin(props.color);
  next.group.scale.setScalar(SCALE);
  place(next, performance.now());
  return next;
}

function place(target: Coincoin, now: number) {
  const pose = motion.poseAt(now);
  target.group.position.set(pose.x + 0.5, 0, pose.y + 0.5);
  target.group.rotation.y = pose.heading;
}

watch(
  () => [props.x, props.y] as const,
  ([x, y]) => motion.moveTo(x, y, performance.now(), settings.reducedMotion),
);
// Déclaré après la position : quand les deux changent, l'ordre reçu l'emporte.
watch(
  () => props.facing,
  (facing) => {
    if (facing) motion.face(...FACING_STEP[facing], performance.now(), settings.reducedMotion);
  },
);
watch(
  () => props.color,
  (color) => duck.value.setColor(color),
);
// Le décompte est local : le serveur n'envoie aucun état tant que personne ne bouge.
watch(
  () => props.immuneForMs,
  (remaining) => {
    immuneUntil = performance.now() + remaining;
  },
  { immediate: true },
);

function tick() {
  const now = performance.now();
  place(duck.value, now);
  duck.value.setAntennaColor(antennaColor(now, settings.reducedMotion));
  const remaining = immuneUntil - now;
  const phase = Math.sin((remaining / 1000) * PULSES_PER_SECOND * Math.PI * 2);
  duck.value.setOpacity(remaining > 0 ? MIN_OPACITY + (1 - MIN_OPACITY) * (0.5 + 0.5 * phase) : 1);
  frame = requestAnimationFrame(tick);
}

onMounted(tick);
onUnmounted(() => {
  if (frame !== undefined) cancelAnimationFrame(frame);
  duck.value.dispose();
});
</script>

<template>
  <primitive :key="duck.group.uuid" :object="duck.group" />
</template>

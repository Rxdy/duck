<script setup lang="ts">
import { onMounted, onUnmounted, shallowRef, watch } from "vue";
import { createDuckMotion } from "../../composables/useDuckMotion.js";
import { antennaColor, createCoincoin, type Coincoin } from "../../lib/coincoin.js";
import { useSettingsStore } from "../../store/settingsStore.js";

const props = withDefaults(
  defineProps<{
    color: string;
    /** Case occupée, telle que donnée par le serveur. */
    x: number;
    y: number;
    // Millisecondes d'intouchabilité restantes (voir back/src/game-engine/
    // game.ts) : le canard clignote tant qu'elles s'écoulent.
    immuneForMs?: number;
  }>(),
  { immuneForMs: 0 },
);

/** Un peu réduit pour que le bec reste dans sa case. */
const SCALE = 0.85;
// Clignotement d'immunité volontairement discret : une pulsation lente, pas un stroboscope.
const PULSES_PER_SECOND = 2.5;
const MIN_OPACITY = 0.6;

const settings = useSettingsStore();
const motion = createDuckMotion(props.x, props.y);
const duck = shallowRef<Coincoin>(build());
let immuneUntil = 0;
let frame: number | undefined;

function build(): Coincoin {
  const next = createCoincoin(props.color, settings.duckFinish);
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
watch(
  () => props.color,
  (color) => duck.value.setColor(color),
);
watch(
  () => settings.duckFinish,
  () => {
    const previous = duck.value;
    duck.value = build();
    previous.dispose();
  },
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

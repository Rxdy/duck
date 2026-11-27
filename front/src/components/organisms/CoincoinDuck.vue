<script setup lang="ts">
import { onMounted, onUnmounted, shallowRef, watch } from "vue";
import type { Direction } from "../../types.js";
import { createDuckMotion } from "../../composables/useDuckMotion.js";
import { antennaColor, createCoincoin, type Coincoin } from "../../lib/coincoin.js";
import { useSettingsStore } from "../../store/settingsStore.js";
import { dress, type Dressing } from "../../lib/outfit.js";

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
    /** Accessoires portés. */
    outfit?: string[];
    /**
     * Touché : instant (performance.now) où l'attaquant arrive sur lui. Donné avec la nouvelle
     * position, il fait attendre l'impact avant le retour à la base.
     */
    knockAt?: number;
  }>(),
  { immuneForMs: 0, outfit: () => [] },
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
const duck = shallowRef(build());
let immuneUntil = 0;
let frame: number | undefined;

function build(): { coincoin: Coincoin; dressing: Dressing } {
  const coincoin = createCoincoin(props.color);
  const dressing = dress(coincoin, props.outfit);
  place(coincoin, performance.now());
  return { coincoin, dressing };
}

function release({ coincoin, dressing }: ReturnType<typeof build>) {
  dressing.dispose();
  coincoin.dispose();
}

function place(target: Coincoin, now: number) {
  const pose = motion.poseAt(now);
  target.group.position.set(pose.x + 0.5, 0, pose.y + 0.5);
  target.group.rotation.y = pose.heading;
  target.group.scale.setScalar(SCALE * Math.max(pose.appear, 0.001));
}

watch(
  () => [props.x, props.y] as const,
  ([x, y]) => {
    const now = performance.now();
    if (props.knockAt !== undefined && props.knockAt >= now - 50) {
      motion.knockOut(x, y, now, props.knockAt - now, settings.reducedMotion);
    } else {
      motion.moveTo(x, y, now, settings.reducedMotion);
    }
  },
);
// Déclaré après la position : quand les deux changent, l'ordre reçu l'emporte.
watch(
  () => props.facing,
  (facing) => {
    if (facing) motion.face(...FACING_STEP[facing], performance.now(), settings.reducedMotion);
  },
);
// Tenue ou couleur changée : on refait le canard (certaines pièces reprennent sa couleur). La tenue
// est comparée par son contenu : chaque message du serveur apporte un nouveau tableau identique.
watch(
  () => `${props.color}|${props.outfit.join(",")}`,
  () => {
    const previous = duck.value;
    duck.value = build();
    release(previous);
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
  const { coincoin, dressing } = duck.value;
  place(coincoin, now);
  coincoin.setAntennaColor(antennaColor(now, settings.reducedMotion));
  const remaining = immuneUntil - now;
  const phase = Math.sin((remaining / 1000) * PULSES_PER_SECOND * Math.PI * 2);
  const opacity = remaining > 0 ? MIN_OPACITY + (1 - MIN_OPACITY) * (0.5 + 0.5 * phase) : 1;
  coincoin.setOpacity(opacity);
  dressing.setOpacity(opacity);
  frame = requestAnimationFrame(tick);
}

onMounted(tick);
onUnmounted(() => {
  if (frame !== undefined) cancelAnimationFrame(frame);
  release(duck.value);
});
</script>

<template>
  <primitive :key="duck.coincoin.group.uuid" :object="duck.coincoin.group" />
</template>

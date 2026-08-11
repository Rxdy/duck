<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue";
import type { Facing } from "../../lib/board.js";
import { DUCK_SPRITE_ASPECT, duckTexture } from "../../lib/duckSprite.js";

/**
 * Canard-sprite : le dessin correspondant à la couleur du joueur et à sa
 * direction (voir lib/duckSprite.ts) plaqué sur un THREE.Sprite, qui reste
 * toujours face à la caméra quel que soit l'angle isométrique — le décor est
 * en 3D, le personnage est une image plate. Le déplacement se fait par
 * téléportation case par case, donc aucune animation de transition à gérer
 * ici : juste l'une des 4 poses.
 */
const props = withDefaults(
  defineProps<{
    color: string;
    size?: number;
    facing?: Facing;
    // Millisecondes d'intouchabilité restantes (voir back/src/game-engine/
    // game.ts) : le canard clignote tant qu'elles s'écoulent.
    immuneForMs?: number;
  }>(),
  { size: 0.8, facing: "se", immuneForMs: 0 },
);

const texture = computed(() => duckTexture(props.color, props.facing));

// `size` est la HAUTEUR du canard : la largeur en découle, pour que le dessin
// ne soit jamais déformé quelle que soit la taille demandée.
const spriteScale = computed((): [number, number, number] => [
  props.size * DUCK_SPRITE_ASPECT,
  props.size,
  1,
]);

/**
 * Clignotement pendant l'immunité. Volontairement DISCRET : une pulsation
 * lente entre pleine opacité et 60 %, pas un stroboscope — il faut lire « il
 * vient de réapparaître, on ne peut pas le toucher », pas être ébloui.
 *
 * Le décompte est local : le serveur envoie la durée restante à chaque
 * message d'état, mais il n'en envoie aucun tant que personne ne bouge —
 * s'appuyer sur eux laisserait un canard clignoter indéfiniment dans une
 * partie à l'arrêt.
 */
const PULSES_PER_SECOND = 2.5;
const MIN_OPACITY = 0.6;

const opacity = ref(1);
let frame: number | undefined;
let endsAt = 0;

function stopBlinking() {
  if (frame !== undefined) cancelAnimationFrame(frame);
  frame = undefined;
  opacity.value = 1;
}

function tick() {
  const remaining = endsAt - performance.now();
  if (remaining <= 0) {
    stopBlinking();
    return;
  }
  const phase = Math.sin((remaining / 1000) * PULSES_PER_SECOND * Math.PI * 2);
  opacity.value = MIN_OPACITY + (1 - MIN_OPACITY) * (0.5 + 0.5 * phase);
  frame = requestAnimationFrame(tick);
}

watch(
  () => props.immuneForMs,
  (remaining) => {
    if (remaining <= 0) {
      stopBlinking();
      return;
    }
    endsAt = performance.now() + remaining;
    if (frame === undefined) frame = requestAnimationFrame(tick);
  },
  { immediate: true },
);

onUnmounted(stopBlinking);
</script>

<template>
  <TresSprite v-if="texture" :scale="spriteScale">
    <TresSpriteMaterial :map="texture" transparent :alpha-test="0.5" :opacity="opacity" />
  </TresSprite>
</template>

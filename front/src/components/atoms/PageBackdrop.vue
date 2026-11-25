<script setup lang="ts">
import { DUCK_GLOW, DUCK_IMAGES } from "../../lib/ducks.js";

/**
 * Décor de fond : sur grand écran, des canards posés sur des dalles de chaque côté de la colonne de contenu, qui resterait
 * sinon entourée de vide. Purement décoratif.
 */
const SIDES = [
  { duck: DUCK_IMAGES.rouge, place: "left-[6%] top-[14%] h-28 w-28" },
  { duck: DUCK_IMAGES.jaune, place: "left-[13%] bottom-[12%] h-20 w-20" },
  { duck: DUCK_IMAGES.cyan, place: "right-[7%] top-[24%] h-24 w-24" },
  { duck: DUCK_IMAGES.vert, place: "right-[12%] bottom-[10%] h-32 w-32" },
];
</script>

<template>
  <div aria-hidden="true" class="pointer-events-none absolute inset-0 overflow-hidden">
    <div class="hidden xl:block">
      <div
        v-for="side in SIDES"
        :key="side.duck"
        class="absolute flex flex-col items-center"
        :class="side.place"
        :style="{ '--duck-glow': DUCK_GLOW[side.duck] }"
      >
        <img :src="side.duck" alt="" class="duck-glow h-full w-full object-contain" />
        <!-- La dalle sur laquelle il est posé, en losange comme le plateau. -->
        <div class="panel -mt-8 h-16 w-16 shrink-0 [transform:scaleY(0.55)_rotate(45deg)]" />
      </div>
    </div>
  </div>
</template>

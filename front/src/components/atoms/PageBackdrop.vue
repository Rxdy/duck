<script setup lang="ts">
import { onMounted, ref } from "vue";
import { DUCK_GLOW, DUCK_IMAGES } from "../../lib/ducks.js";
import { sceneFor } from "../../lib/scenes/noel.js";
import DuckPortrait from "./DuckPortrait.vue";

/**
 * Décor de fond : sur grand écran, des canards posés sur des dalles de chaque côté de la colonne de contenu, qui resterait
 * sinon entourée de vide. Chacun porte un thème tiré au hasard dans le catalogue des accessoires, différent à chaque
 * visite. Purement décoratif.
 */
const SIDES = [
  { color: "#FF4D6D", glow: DUCK_GLOW[DUCK_IMAGES.rouge]!, place: "left-[5%] top-[12%] h-36 w-36" },
  {
    color: "#FFB100",
    glow: DUCK_GLOW[DUCK_IMAGES.jaune]!,
    place: "left-[12%] bottom-[10%] h-28 w-28",
  },
  { color: "#00C2D1", glow: DUCK_GLOW[DUCK_IMAGES.cyan]!, place: "right-[6%] top-[20%] h-32 w-32" },
  {
    color: "#3FC46B",
    glow: DUCK_GLOW[DUCK_IMAGES.vert]!,
    place: "right-[11%] bottom-[8%] h-40 w-40",
  },
];

// Une scène de saison remplace les portraits ; ?scene=noel la force hors saison (voir lib/scenes/noel.ts).
const scene = sceneFor(new Date(), new URLSearchParams(window.location.search).get("scene"));

const outfits = ref<string[][]>(SIDES.map(() => []));

onMounted(async () => {
  // Le décor n'existe qu'à partir de xl : pas de 3D, ni de catalogue chargé, sur un téléphone.
  if (!window.matchMedia("(min-width: 1280px)").matches) return;
  const { randomThemes } = await import("../../lib/backdropOutfits.js");
  outfits.value = randomThemes(SIDES.length);
});
</script>

<template>
  <div aria-hidden="true" class="pointer-events-none absolute inset-0 overflow-hidden">
    <!-- La scène de saison, sur tout le fond (fabriquée par scripts/render-scenes.mjs). Un voile assombrit le milieu,
         là où se pose le contenu, pour qu'il reste lisible : les décors restent bien visibles sur les côtés. -->
    <template v-if="scene">
      <img
        :src="`/scenes/${scene.id}.jpg`"
        alt=""
        class="absolute inset-0 h-full w-full select-none object-cover"
      />
      <div
        class="absolute inset-0 bg-surface-deep/60 [background-image:linear-gradient(90deg,transparent_0%,rgb(var(--surface-deep)/0.55)_26%,rgb(var(--surface-deep)/0.55)_74%,transparent_100%)] md:bg-surface-deep/0"
      />
    </template>
    <div v-else class="hidden xl:block">
      <div
        v-for="(side, index) in SIDES"
        :key="side.color"
        class="absolute flex flex-col items-center"
        :class="side.place"
        :style="{ '--duck-glow': side.glow }"
      >
        <!-- Devant sa dalle (z-10) : sinon elle lui cache les pieds. -->
        <DuckPortrait
          :color="side.color"
          :outfit="outfits[index]"
          class="duck-glow relative z-10 h-full w-full"
        />
        <!-- La dalle sur laquelle il est posé, en losange comme le plateau. -->
        <div class="panel -mt-8 h-16 w-16 shrink-0 [transform:scaleY(0.55)_rotate(45deg)]" />
      </div>
    </div>
  </div>
</template>

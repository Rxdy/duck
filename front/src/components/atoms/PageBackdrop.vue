<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { DUCK_GLOW, DUCK_IMAGES } from "../../lib/ducks.js";
import { editionFor, imagePath, layoutFor } from "../../lib/scenes/calendar.js";
import type { Device, PageKind } from "../../lib/scenes/types.js";
import DuckPortrait from "./DuckPortrait.vue";

/**
 * Décor de fond. En période d'événement (voir lib/scenes/calendar.ts), une grande image habille tout le
 * fond, composée pour la page et pour le format de l'écran : l'accueil n'a pas la même que le classement,
 * un téléphone debout n'a pas la même qu'un écran large. Un voile assombrit le milieu, là où se pose le
 * contenu. Hors événement, sur grand écran : des canards posés sur des dalles de chaque côté, chacun dans
 * un thème tiré au hasard. Purement décoratif.
 */
const props = withDefaults(defineProps<{ page?: PageKind }>(), { page: "defaut" });

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

// ?scene=noel (ou noel-2026) force un événement hors saison, pour le voir.
const edition = editionFor(new Date(), new URLSearchParams(window.location.search).get("scene"));

// Le format suit l'écran : on tourne une tablette, l'image change.
const portrait = window.matchMedia("(orientation: portrait)");
const device = ref<Device>(portrait.matches ? "portrait" : "paysage");
const follow = () => (device.value = portrait.matches ? "portrait" : "paysage");
onMounted(() => portrait.addEventListener("change", follow));
onUnmounted(() => portrait.removeEventListener("change", follow));

const image = computed(() => {
  if (!edition) return undefined;
  const layout = layoutFor(edition, props.page, device.value);
  return layout ? imagePath(edition, layout) : undefined;
});

const outfits = ref<string[][]>(SIDES.map(() => []));

onMounted(async () => {
  // Les portraits n'existent qu'à partir de xl : pas de 3D, ni de catalogue chargé, sur un téléphone.
  if (image.value || !window.matchMedia("(min-width: 1280px)").matches) return;
  const { randomThemes } = await import("../../lib/backdropOutfits.js");
  outfits.value = randomThemes(SIDES.length);
});
</script>

<template>
  <div aria-hidden="true" class="pointer-events-none absolute inset-0 overflow-hidden">
    <template v-if="image">
      <img :src="image" alt="" class="absolute inset-0 h-full w-full select-none object-cover" />
      <!-- Le voile : plus fort au milieu, où se pose le contenu ; sur un écran étroit, il couvre tout. -->
      <div
        class="absolute inset-0 bg-surface-deep/55 md:bg-transparent md:[background-image:linear-gradient(90deg,transparent_0%,rgb(var(--surface-deep)/0.55)_26%,rgb(var(--surface-deep)/0.55)_74%,transparent_100%)]"
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

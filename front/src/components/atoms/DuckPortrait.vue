<script setup lang="ts">
import { ref, watch } from "vue";
import { DUCK_IMAGES } from "../../lib/ducks.js";
import { PLAYER_COLORS } from "../../theme.js";

/**
 * Le canard en entier, centré, avec la tenue donnée : le même dans tous les menus. L'image toute
 * faite sert en attendant, ou sans 3D.
 */
const props = withDefaults(defineProps<{ outfit?: string[]; color?: string; back?: boolean }>(), {
  outfit: () => [],
  color: PLAYER_COLORS[0],
  back: false,
});

const source = ref<string>(DUCK_IMAGES.rouge);

const wanted = () => `${props.color}|${props.back}|${props.outfit.join(",")}`;

watch(
  wanted,
  async (key) => {
    // Chargé à la demande : la 3D ne doit pas peser sur l'ouverture du site.
    const { renderDuck } = await import("../../lib/duckRenderer.js");
    if (key !== wanted()) return; // la tenue a encore changé entre-temps
    source.value = renderDuck(props.color, props.outfit, props.back) ?? DUCK_IMAGES.rouge;
  },
  { immediate: true },
);
</script>

<template>
  <img :src="source" alt="" class="object-contain" />
</template>

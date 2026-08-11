<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { toPlacedTiles } from "../../lib/mapEditor.js";
import type { OfficialMap } from "../../lib/mapsApi.js";
import BoardPreview from "../organisms/BoardPreview.vue";

/**
 * Les cartes sur lesquelles on peut tomber dans un mode, en vue isométrique —
 * celle de la partie, pas celle de l'éditeur : le joueur doit reconnaître le
 * plateau une fois en jeu.
 *
 * N'est monté que pour le mode déplié (voir pages/Play.vue) : chaque aperçu
 * ouvre son propre contexte WebGL, et un navigateur en refuse au-delà d'une
 * poignée. Afficher les 9 cartes d'un coup les ferait s'éteindre les unes
 * après les autres.
 */
const props = defineProps<{ maps: OfficialMap[] }>();

const current = ref(0);
watch(
  () => props.maps,
  () => {
    current.value = 0;
  },
);

function go(step: number) {
  const total = props.maps.length;
  current.value = (current.value + step + total) % total;
}

const previews = computed(() =>
  props.maps.map((map) => ({
    ...map,
    // BoardPreview colore les bases d'après les joueurs présents ; ici il n'y
    // en a aucun, ce sont les cases elles-mêmes qui portent leur couleur.
    placed: toPlacedTiles({ width: map.width, height: map.height, tiles: map.tiles }),
  })),
);
</script>

<template>
  <!-- Un carrousel plutôt que toutes les cartes empilées : à 130 px de large
       on ne distingue que la silhouette du plateau, pas ses couloirs — et une
       seule carte à la fois n'ouvre qu'un contexte WebGL au lieu de trois. -->
  <div v-if="previews.length > 0" class="flex flex-col gap-2">
    <div
      class="relative aspect-[4/3] overflow-hidden rounded-lg border border-ink/10 bg-surface-deep"
    >
      <BoardPreview
        :key="previews[current]!.name"
        :width="previews[current]!.width"
        :height="previews[current]!.height"
        :tiles="previews[current]!.placed"
        :fit="0.44"
      />

      <button
        v-if="previews.length > 1"
        type="button"
        aria-label="Carte précédente"
        class="absolute left-2 top-1/2 h-9 w-9 -translate-y-1/2 rounded-full bg-surface-deep/70 text-ink/70"
        @click="go(-1)"
      >
        ‹
      </button>
      <button
        v-if="previews.length > 1"
        type="button"
        aria-label="Carte suivante"
        class="absolute right-2 top-1/2 h-9 w-9 -translate-y-1/2 rounded-full bg-surface-deep/70 text-ink/70"
        @click="go(1)"
      >
        ›
      </button>

      <span
        class="absolute bottom-2 left-1/2 -translate-x-1/2 rounded bg-surface-deep/70 px-2 py-0.5 text-[11px] text-ink/60"
      >
        {{ current + 1 }} / {{ previews.length }} · {{ previews[current]!.width - 2 }}×{{
          previews[current]!.height - 2
        }}
      </span>
    </div>
  </div>

  <p v-else class="text-xs text-ink/40">Aucune carte disponible pour ce mode.</p>
</template>

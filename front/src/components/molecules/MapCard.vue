<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { playableLabel } from "../../lib/mapEditor.js";
import { renderMapThumbnail } from "../../lib/mapThumbnail.js";
import type { SavedMap } from "../../lib/mapsApi.js";
import { useSettingsStore } from "../../store/settingsStore.js";

/**
 * Une carte du joueur, montrée par son PLATEAU plutôt que par son nom.
 *
 * La liste précédente n'affichait qu'une ligne de texte : on ne reconnaissait
 * pas ses propres cartes, et « map 3 » ne dit rien de ce qu'on a construit. La
 * vignette est en vue isométrique, la même que celle d'une partie, pour qu'on
 * retrouve le plateau une fois en jeu.
 *
 * C'est une IMAGE, pas un aperçu vivant : une grille d'aperçus vivants
 * dépasserait le nombre de contextes WebGL qu'un navigateur accorde, et les
 * cartes s'éteindraient les unes après les autres (voir lib/mapThumbnail.ts).
 */
const props = defineProps<{ map: SavedMap }>();
const emit = defineEmits<{ open: [] }>();

const settings = useSettingsStore();
const thumbnail = ref<string | undefined>();

// Rendue à l'affichage, puis à chaque changement de thème ou de contenu : une
// vignette sombre sur une interface claire se lit comme une image cassée.
function render() {
  thumbnail.value = renderMapThumbnail(
    { width: props.map.width, height: props.map.height, tiles: props.map.tiles },
    settings.theme,
  );
}

onMounted(render);
watch([() => props.map, () => settings.theme], render, { deep: true });

// Dimensions JOUABLES : les bordures sont des murs que le joueur n'a jamais
// choisis, les compter donnerait une taille qu'il ne reconnaîtrait pas.
const size = computed(() => `${props.map.width - 2}×${props.map.height - 2}`);
</script>

<template>
  <button
    type="button"
    class="flex flex-col overflow-hidden rounded-xl border border-ink/10 bg-surface text-left transition active:scale-95"
    @click="emit('open')"
  >
    <div class="relative aspect-[4/3] w-full bg-surface-deep">
      <img
        v-if="thumbnail"
        :src="thumbnail"
        :alt="`Aperçu de la carte ${map.name}`"
        class="h-full w-full object-cover"
      />
      <!-- Pas de rendu 3D dans ce navigateur : on montre quand même une carte
           utilisable plutôt qu'un trou (voir lib/mapThumbnail.ts). -->
      <div v-else class="flex h-full w-full items-center justify-center text-2xl text-ink/20">
        <i class="ri-map-2-line" aria-hidden="true" />
      </div>

      <span
        class="absolute bottom-1.5 right-1.5 rounded bg-surface-deep/80 px-1.5 py-0.5 text-[11px] text-ink/70"
      >
        {{ size }}
      </span>
    </div>

    <div class="flex flex-col gap-0.5 px-3 py-2">
      <span class="truncate text-sm font-semibold">{{ map.name }}</span>
      <span class="truncate text-[11px] text-ink/40">{{ playableLabel(map.spawnCount) }}</span>
    </div>
  </button>
</template>

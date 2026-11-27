<script setup lang="ts">
import { ref, watch } from "vue";
import type { SavedMap } from "../../lib/mapsApi.js";

/**
 * Les actions d'une carte, dans une feuille qui monte du bas.
 *
 * Trois formes étaient possibles (menu contextuel, feuille du bas, boutons
 * posés sur la vignette). La feuille gagne pour une raison de doigt : le jeu se
 * joue sur téléphone, le bas de l'écran est la seule zone qu'un pouce atteint
 * sans changer de prise, et quatre cibles y tiennent à pleine taille. Des
 * boutons sur la vignette mangeraient l'aperçu qu'on vient justement d'ajouter,
 * et un menu contextuel s'ouvre là où on a touché — donc n'importe où.
 */
const props = defineProps<{
  map: SavedMap;
  /** Pourquoi la publication a été refusée (carte déséquilibrée). */
  publishProblems?: string[];
}>();
const emit = defineEmits<{
  close: [];
  edit: [];
  preview: [];
  publish: [published: boolean];
  export: [];
  delete: [];
}>();

/**
 * La suppression demande une confirmation, sur place plutôt que dans une
 * seconde fenêtre. Une carte est du travail : on ne la perd pas sur un doigt
 * qui glisse, et rien ici ne permet de la récupérer ensuite.
 */
const confirmingDelete = ref(false);
watch(
  () => props.map.id,
  () => {
    confirmingDelete.value = false;
  },
);
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-end justify-center bg-surface-deep/80"
    role="dialog"
    aria-modal="true"
    :aria-label="`Actions pour la carte ${map.name}`"
    @click.self="emit('close')"
  >
    <div class="flex w-full max-w-md flex-col gap-1 rounded-t-2xl bg-surface p-3 pb-6">
      <p class="truncate px-2 pb-1 pt-1 text-sm font-semibold">{{ map.name }}</p>

      <template v-if="!confirmingDelete">
        <button
          type="button"
          class="flex items-center gap-3 rounded-lg px-3 py-3 text-left text-sm active:bg-ink/10"
          @click="emit('edit')"
        >
          <i class="ri-pencil-line text-lg text-ink/60" aria-hidden="true" />
          Modifier
        </button>
        <button
          type="button"
          class="flex items-center gap-3 rounded-lg px-3 py-3 text-left text-sm active:bg-ink/10"
          @click="emit('preview')"
        >
          <i class="ri-eye-line text-lg text-ink/60" aria-hidden="true" />
          Voir un aperçu
        </button>
        <button
          type="button"
          class="flex items-center gap-3 rounded-lg px-3 py-3 text-left text-sm active:bg-ink/10"
          @click="emit('publish', !map.published)"
        >
          <i
            class="text-lg text-ink/60"
            :class="map.published ? 'ri-eye-off-line' : 'ri-earth-line'"
            aria-hidden="true"
          />
          {{ map.published ? "Retirer de la galerie" : "Publier dans la galerie" }}
        </button>
        <div
          v-if="publishProblems?.length"
          role="status"
          class="mx-3 rounded-lg bg-amber-400/10 px-3 py-2 text-xs text-amber-300"
        >
          <p class="font-semibold">Pas encore publiable :</p>
          <ul class="list-disc pl-4">
            <li v-for="problem in publishProblems" :key="problem">{{ problem }}</li>
          </ul>
        </div>
        <button
          type="button"
          class="flex items-center gap-3 rounded-lg px-3 py-3 text-left text-sm active:bg-ink/10"
          @click="emit('export')"
        >
          <i class="ri-download-line text-lg text-ink/60" aria-hidden="true" />
          Exporter
        </button>
        <button
          type="button"
          class="flex items-center gap-3 rounded-lg px-3 py-3 text-left text-sm text-rose-400 active:bg-ink/10"
          @click="confirmingDelete = true"
        >
          <i class="ri-delete-bin-line text-lg" aria-hidden="true" />
          Supprimer
        </button>
      </template>

      <template v-else>
        <p class="px-3 py-2 text-sm text-ink/60">Supprimer « {{ map.name }} » ? C'est définitif.</p>
        <button
          type="button"
          class="rounded-lg bg-rose-500 px-3 py-3 text-sm font-semibold text-slate-950 active:scale-95"
          @click="emit('delete')"
        >
          Supprimer définitivement
        </button>
        <button
          type="button"
          class="rounded-lg px-3 py-3 text-sm text-ink/60 active:bg-ink/10"
          @click="confirmingDelete = false"
        >
          Annuler
        </button>
      </template>
    </div>
  </div>
</template>

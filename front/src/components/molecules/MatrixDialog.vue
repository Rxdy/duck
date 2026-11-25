<script setup lang="ts">
import { computed, ref, watch } from "vue";
import AppButton from "../atoms/AppButton.vue";

/**
 * Extraction / import de la grille d'une carte, sous forme de texte (voir
 * lib/mapMatrix.ts). Le code parle de "matrice", l'interface parle de
 * "grille" : le second est le mot du joueur, le premier celui de l'ingénieur.
 *
 * En import, le texte collé remplace intégralement le travail en cours :
 * l'avertissement n'est affiché que si ce travail existe vraiment (une carte
 * encore vierge n'a rien à perdre, et prévenir pour rien apprend au joueur à
 * ignorer les avertissements).
 */
const props = defineProps<{
  mode: "export" | "import";
  // Grille de la carte actuelle : affichée telle quelle en export, sert de
  // repère de format en import (placeholder).
  matrix: string;
  // Vrai si la carte en cours contient autre chose qu'un plateau vide.
  hasWork: boolean;
  error?: string;
}>();

const emit = defineEmits<{ close: []; import: [text: string] }>();

const draft = ref("");
const copied = ref(false);

// Rouvrir la modale ne doit jamais montrer la saisie précédente ni un
// « Copié ! » périmé.
watch(
  () => [props.mode, props.matrix],
  () => {
    draft.value = "";
    copied.value = false;
  },
);

const title = computed(() =>
  props.mode === "export" ? "Grille de la carte" : "Importer une grille",
);

async function copyMatrix() {
  try {
    await navigator.clipboard.writeText(props.matrix);
    copied.value = true;
  } catch {
    // Presse-papiers refusé (contexte non sécurisé, permission) : le texte
    // reste sélectionnable à la main, on ne bloque pas pour autant.
    copied.value = false;
  }
}
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-surface-deep/80 p-4"
    @click.self="emit('close')"
  >
    <div
      class="flex max-h-full w-full max-w-lg flex-col gap-3 overflow-y-auto rounded-xl border border-ink/10 bg-surface p-4"
    >
      <h2 class="text-lg font-bold">{{ title }}</h2>

      <p class="text-xs text-ink/60">
        <span class="font-semibold text-ink/80">#</span> mur ·
        <span class="font-semibold text-ink/80">.</span> vide ·
        <span class="font-semibold text-ink/80">0</span> à
        <span class="font-semibold text-ink/80">3</span> spawns. Une ligne de texte par rangée de
        cases, contour fermé par des murs.
      </p>

      <textarea
        v-if="mode === 'export'"
        :value="matrix"
        readonly
        rows="12"
        class="w-full resize-y whitespace-pre rounded-lg border border-ink/10 bg-surface-deep p-3 font-mono text-xs leading-tight text-ink"
      ></textarea>

      <template v-else>
        <p v-if="hasWork" class="rounded-lg bg-amber-500/15 px-3 py-2 text-xs text-amber-300">
          La carte en cours d'édition sera entièrement remplacée, et ce qui n'a pas été sauvegardé
          sera perdu.
        </p>
        <textarea
          v-model="draft"
          rows="12"
          :placeholder="matrix"
          class="w-full resize-y whitespace-pre rounded-lg border border-ink/10 bg-surface-deep p-3 font-mono text-xs leading-tight text-ink placeholder:text-ink/25"
        ></textarea>
        <p v-if="error" class="text-xs text-rose-400">{{ error }}</p>
      </template>

      <div class="flex gap-2">
        <AppButton v-if="mode === 'export'" class="flex-1" @click="copyMatrix">
          {{ copied ? "Copié !" : "Copier" }}
        </AppButton>
        <AppButton
          v-else
          class="flex-1"
          :disabled="draft.trim().length === 0"
          @click="emit('import', draft)"
        >
          {{ hasWork ? "Écraser et importer" : "Importer" }}
        </AppButton>
        <AppButton class="flex-1" @click="emit('close')">Fermer</AppButton>
      </div>
    </div>
  </div>
</template>

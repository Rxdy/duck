<script setup lang="ts">
import { computed } from "vue";
import {
  BOARD_PRESETS,
  clampPlayableSize,
  CUSTOM_SIZE_ID,
  MAX_PLAYABLE_SIZE,
  MIN_PLAYABLE_SIZE,
} from "../../lib/board.js";

/**
 * Taille du plateau : des presets pour aller vite, et une entrée « Sur
 * mesure… » qui révèle deux champs libres — une carte n'a aucune raison
 * d'être limitée à six formats, et une matrice importée (voir
 * lib/mapMatrix.ts) tombe rarement pile sur un preset.
 *
 * Les champs ne sont visibles QUE dans ce mode : avec un preset, ils
 * répéteraient la taille déjà écrite dans l'option choisie ("M · 15×9").
 *
 * Les valeurs manipulées ici sont toujours la zone JOUABLE, murs du contour
 * exclus, comme les presets.
 */
const props = defineProps<{
  modelValue: string;
  playableWidth: number;
  playableHeight: number;
}>();

const emit = defineEmits<{
  // Preset choisi, ou CUSTOM_SIZE_ID pour passer en taille libre.
  select: [id: string];
  resize: [width: number, height: number];
}>();

const duelPresets = BOARD_PRESETS.filter((p) => p.category === "duel");
const equipePresets = BOARD_PRESETS.filter((p) => p.category === "equipe");

const isCustom = computed(() => props.modelValue === CUSTOM_SIZE_ID);

function select(id: string) {
  emit("select", id);
}

// Une taille est appliquée à la sortie du champ (@change), jamais à chaque
// frappe : "1" puis "12" recréerait deux cartes, dont une minuscule.
function applyWidth(value: string) {
  emit("resize", clampPlayableSize(Number(value)), props.playableHeight);
}
function applyHeight(value: string) {
  emit("resize", props.playableWidth, clampPlayableSize(Number(value)));
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <select
      class="rounded-lg border border-ink/10 bg-ink/10 px-3 py-2 text-sm text-ink"
      :value="modelValue"
      @change="select(($event.target as HTMLSelectElement).value)"
    >
      <option :value="CUSTOM_SIZE_ID">Sur mesure…</option>
      <optgroup label="Duel (1v1)">
        <option v-for="p in duelPresets" :key="p.id" :value="p.id">
          {{ p.label }} · {{ p.width }}×{{ p.height }}
        </option>
      </optgroup>
      <optgroup label="Équipe / FFA">
        <option v-for="p in equipePresets" :key="p.id" :value="p.id">
          {{ p.label }} · {{ p.width }}×{{ p.height }}
        </option>
      </optgroup>
    </select>

    <div v-if="isCustom" class="flex items-center gap-1 text-sm text-ink/60">
      <input
        type="number"
        aria-label="Largeur jouable"
        :value="playableWidth"
        :min="MIN_PLAYABLE_SIZE"
        :max="MAX_PLAYABLE_SIZE"
        class="w-16 rounded-lg border border-ink/10 bg-ink/10 px-2 py-2 text-center text-ink"
        @change="applyWidth(($event.target as HTMLInputElement).value)"
      />
      <span>×</span>
      <input
        type="number"
        aria-label="Hauteur jouable"
        :value="playableHeight"
        :min="MIN_PLAYABLE_SIZE"
        :max="MAX_PLAYABLE_SIZE"
        class="w-16 rounded-lg border border-ink/10 bg-ink/10 px-2 py-2 text-center text-ink"
        @change="applyHeight(($event.target as HTMLInputElement).value)"
      />
      <span class="text-xs text-ink/40">max {{ MAX_PLAYABLE_SIZE }}</span>
    </div>
  </div>
</template>

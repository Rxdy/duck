<script setup lang="ts">
import AppButton from "../atoms/AppButton.vue";
import BoardPreview from "../organisms/BoardPreview.vue";
import type { TileKind } from "../../lib/mapEditor.js";

/**
 * La carte en cours vue comme en partie (isométrique), sans lancer de partie.
 * L'éditeur travaille de dessus — plus précis pour poser les cases — mais on
 * ne voit jamais ce que le joueur verra vraiment : un couloir agréable vu du
 * ciel peut se révéler illisible une fois le plateau incliné.
 */
defineProps<{
  width: number;
  height: number;
  tiles: { x: number; y: number; kind: TileKind }[];
}>();

const emit = defineEmits<{ close: [] }>();
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-surface-deep/90 p-4"
    @click.self="emit('close')"
  >
    <div class="flex w-full max-w-2xl flex-col gap-3">
      <!-- Cadre paysage plutôt que pleine hauteur : le plateau isométrique est
           bien plus large que haut, l'étirer en portrait ne fait qu'ajouter du
           vide au-dessus et en dessous. -->
      <div class="aspect-[4/3] overflow-hidden rounded-xl border border-ink/10 bg-surface-deep">
        <BoardPreview :width="width" :height="height" :tiles="tiles" :fit="0.44" />
      </div>
      <AppButton class="shrink-0" @click="emit('close')">Fermer l'aperçu</AppButton>
    </div>
  </div>
</template>

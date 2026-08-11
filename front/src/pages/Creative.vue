<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { BOARD_PRESETS } from "../lib/board.js";
import { countSpawns, placeTile, playableLabel, toPlacedTiles } from "../lib/mapEditor.js";
import { loadSavedMaps, persistSavedMaps, upsertMap } from "../lib/savedMaps.js";
import { exportMapToServer } from "../lib/mapExport.js";
import { useCreativeEditorStore } from "../store/creativeEditorStore.js";
import { useTestSessionStore } from "../store/testSessionStore.js";
import AppButton from "../components/atoms/AppButton.vue";
import BoardSizeDropdown from "../components/molecules/BoardSizeDropdown.vue";
import ElementPicker from "../components/molecules/ElementPicker.vue";
import BoardPreview from "../components/organisms/BoardPreview.vue";

const route = useRoute();
const router = useRouter();
const testSession = useTestSessionStore();
const editor = useCreativeEditorStore();

const spawnCount = computed(() => countSpawns(editor.map));
const placedTiles = computed(() => toPlacedTiles(editor.map));

function handleSizeChange(id: string) {
  const p = BOARD_PRESETS.find((preset) => preset.id === id)!;
  editor.resetForSize(id, p.width, p.height);
}

function handleTileClick(x: number, y: number) {
  editor.map = placeTile(editor.map, x, y, editor.tool);
}

const notice = ref<string | null>(null);
function notify(message: string) {
  notice.value = message;
}

function handleTest() {
  testSession.setMap(editor.map);
  router.push("/creatif/test");
}

// Repart d'une carte vide à la taille actuellement sélectionnée : détache
// aussi de la carte sauvegardée en cours (currentMapId/mapName), sinon un
// "Sauvegarder" après reset écraserait l'ancienne carte avec du vide.
function handleReset() {
  const preset = BOARD_PRESETS.find((p) => p.id === editor.selectedId)!;
  editor.resetForSize(preset.id, preset.width, preset.height);
  notify("Carte réinitialisée.");
}

// Sauvegarde en local (localStorage) : un nom + un UUID pour pouvoir la
// retrouver et la modifier plus tard, depuis la page /creatif/cartes.
// Envoyée en plus au serveur (back/maps/, catégorie du preset actuel) pour
// pouvoir être reprise plus tard comme carte par défaut.
function handleSave() {
  const { maps, saved } = upsertMap(loadSavedMaps(), {
    id: editor.currentMapId,
    name: editor.mapName,
    map: editor.map,
  });
  persistSavedMaps(maps);
  editor.currentMapId = saved.id;
  editor.mapName = saved.name;
  notify(`Carte "${saved.name}" sauvegardée (${saved.id}).`);

  const preset = BOARD_PRESETS.find((p) => p.id === editor.selectedId);
  if (preset) void exportMapToServer(saved, preset.category);
}

function loadMapById(id: string) {
  const found = loadSavedMaps().find((m) => m.id === id);
  if (!found) return;
  editor.loadMap(found);
  notify(`Carte "${found.name}" chargée.`);
}

// Revenu de /creatif/cartes avec une carte à charger (?load=<uuid>).
onMounted(() => {
  const loadId = route.query.load;
  if (typeof loadId === "string") {
    loadMapById(loadId);
    router.replace({ path: "/creatif" });
  }
});
</script>

<template>
  <div class="flex h-full flex-col gap-3 overflow-y-auto px-4 py-6">
    <div class="flex items-start justify-between gap-2">
      <div>
        <h1 class="text-2xl font-bold">Créatif</h1>
        <p class="text-sm text-white/60">Place les spawns (2 à 4) et les murs, puis sauvegarde.</p>
      </div>
      <RouterLink
        to="/creatif/cartes"
        class="shrink-0 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-white/70"
      >
        Mes cartes
      </RouterLink>
    </div>

    <BoardSizeDropdown :model-value="editor.selectedId" @update:model-value="handleSizeChange" />

    <div class="flex items-center justify-between gap-2">
      <ElementPicker :model-value="editor.tool" @update:model-value="editor.tool = $event" />
      <p class="shrink-0 text-right text-xs text-white/50">
        Spawns {{ spawnCount }}/4<br />
        {{ playableLabel(spawnCount) }}
      </p>
    </div>

    <div class="min-h-0 flex-1 overflow-hidden rounded-xl border border-white/10 bg-slate-900">
      <BoardPreview
        :width="editor.map.width"
        :height="editor.map.height"
        :tiles="placedTiles"
        mode="topDown"
        editable
        @tile-click="handleTileClick"
      />
    </div>

    <input
      v-model="editor.mapName"
      type="text"
      placeholder="Nom de la carte"
      class="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40"
    />

    <div class="flex gap-2">
      <AppButton class="flex-1" @click="handleTest">Tester</AppButton>
      <AppButton class="flex-1" @click="handleSave">Sauvegarder</AppButton>
    </div>
    <AppButton @click="handleReset">Réinitialiser</AppButton>
    <p v-if="notice" class="text-center text-xs text-amber-400">{{ notice }}</p>
  </div>
</template>

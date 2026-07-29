<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { loadSavedMaps, persistSavedMaps, removeMap, upsertMap } from "../lib/savedMaps.js";
import { exportMapAsFile, parseImportedMap, readMapFile } from "../lib/mapShare.js";
import SavedMapsList from "../components/molecules/SavedMapsList.vue";

const router = useRouter();
const savedMaps = ref(loadSavedMaps());
const importError = ref<string | null>(null);

onMounted(() => {
  savedMaps.value = loadSavedMaps();
});

function handleLoad(id: string) {
  router.push({ path: "/creatif", query: { load: id } });
}

function handleDelete(id: string) {
  const maps = removeMap(savedMaps.value, id);
  savedMaps.value = maps;
  persistSavedMaps(maps);
}

function handleExport(id: string) {
  const map = savedMaps.value.find((m) => m.id === id);
  if (map) exportMapAsFile(map);
}

// Import d'une carte partagée par un autre joueur (fichier exporté via
// handleExport) : ajoutée à la liste locale avec un id frais, jamais en
// écrasant une carte existante.
async function handleImport(event: Event) {
  importError.value = null;
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = ""; // permet de réimporter le même fichier juste après

  if (!file) return;

  try {
    const imported = parseImportedMap(await readMapFile(file));
    if (!imported) {
      importError.value = "Fichier de carte invalide.";
      return;
    }
    const { maps } = upsertMap(savedMaps.value, { name: imported.name, map: imported });
    savedMaps.value = maps;
    persistSavedMaps(maps);
  } catch {
    importError.value = "Impossible de lire ce fichier.";
  }
}
</script>

<template>
  <div class="flex h-full flex-col gap-3 px-4 py-6">
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <RouterLink to="/creatif" aria-label="Retour" class="text-xl text-white/60">←</RouterLink>
        <h1 class="text-2xl font-bold">Mes cartes</h1>
      </div>
      <label
        class="shrink-0 cursor-pointer rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-white/70"
      >
        Importer
        <input type="file" accept="application/json" class="hidden" @change="handleImport" />
      </label>
    </div>

    <p v-if="importError" class="text-center text-xs text-amber-400">{{ importError }}</p>

    <SavedMapsList
      :maps="savedMaps"
      @load="handleLoad"
      @delete="handleDelete"
      @export="handleExport"
    />
  </div>
</template>

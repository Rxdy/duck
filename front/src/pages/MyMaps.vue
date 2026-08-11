<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { deleteMyMap, fetchMyMaps, saveMyMap, type SavedMap } from "../lib/mapsApi.js";
import { exportMapAsFile, parseImportedMap, readMapFile } from "../lib/mapShare.js";
import { useAuthStore } from "../store/authStore.js";
import SavedMapsList from "../components/molecules/SavedMapsList.vue";

const router = useRouter();
const auth = useAuthStore();
const savedMaps = ref<SavedMap[]>([]);
const importError = ref<string | null>(null);

async function refresh() {
  savedMaps.value = auth.session ? await fetchMyMaps(auth.session.token) : [];
}

onMounted(refresh);

function handleLoad(id: string) {
  router.push({ path: "/creatif", query: { load: id } });
}

async function handleDelete(id: string) {
  if (!auth.session) return;
  if (await deleteMyMap(auth.session.token, id)) await refresh();
}

function handleExport(id: string) {
  const map = savedMaps.value.find((m) => m.id === id);
  if (map) exportMapAsFile(map);
}

// Import d'une carte partagée par un autre joueur (fichier exporté via
// handleExport) : enregistrée comme une NOUVELLE carte du compte (aucun id
// transmis), jamais en écrasant une carte existante.
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
    if (!auth.session) {
      importError.value = "Connecte-toi pour enregistrer une carte importée.";
      return;
    }
    const saved = await saveMyMap(auth.session.token, { name: imported.name, map: imported });
    if (!saved) {
      importError.value = "Le serveur a refusé cette carte.";
      return;
    }
    await refresh();
  } catch {
    importError.value = "Impossible de lire ce fichier.";
  }
}
</script>

<template>
  <div class="flex h-full flex-col gap-3 px-4 py-6">
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <RouterLink to="/creatif" aria-label="Retour" class="text-xl text-ink/60">←</RouterLink>
        <h1 class="text-2xl font-bold">Mes cartes</h1>
      </div>
      <label
        class="shrink-0 cursor-pointer rounded-lg bg-ink/10 px-3 py-2 text-xs font-semibold text-ink/70"
      >
        Importer
        <input type="file" accept="application/json" class="hidden" @change="handleImport" />
      </label>
    </div>

    <p v-if="importError" class="text-center text-xs text-amber-400">{{ importError }}</p>

    <p v-if="!auth.session" class="rounded-lg bg-surface px-3 py-4 text-center text-sm text-ink/60">
      Tes cartes sont enregistrées sur ton compte.
      <RouterLink to="/connexion" class="text-cyan-400">Connecte-toi</RouterLink>
      pour les retrouver ici.
    </p>

    <SavedMapsList
      :maps="savedMaps"
      @load="handleLoad"
      @delete="handleDelete"
      @export="handleExport"
    />
  </div>
</template>

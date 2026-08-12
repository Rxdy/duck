<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";
import { toPlacedTiles } from "../lib/mapEditor.js";
import { deleteMyMap, fetchMyMaps, saveMyMap, type SavedMap } from "../lib/mapsApi.js";
import { exportMapAsFile, parseImportedMap, readMapFile } from "../lib/mapShare.js";
import { releaseThumbnailRenderer } from "../lib/mapThumbnail.js";
import { useAuthStore } from "../store/authStore.js";
import BoardViewDialog from "../components/molecules/BoardViewDialog.vue";
import MapActionSheet from "../components/molecules/MapActionSheet.vue";
import MapCard from "../components/molecules/MapCard.vue";

const router = useRouter();
const auth = useAuthStore();
const savedMaps = ref<SavedMap[]>([]);
const importError = ref<string | null>(null);

/** Carte dont on a ouvert les actions, et carte dont on regarde l'aperçu. */
const selectedId = ref<string | null>(null);
const previewedId = ref<string | null>(null);
const selected = computed(() => savedMaps.value.find((m) => m.id === selectedId.value));
const previewed = computed(() => savedMaps.value.find((m) => m.id === previewedId.value));
const previewedTiles = computed(() =>
  previewed.value ? toPlacedTiles(previewed.value) : undefined,
);

async function refresh() {
  savedMaps.value = auth.session ? await fetchMyMaps(auth.session.token) : [];
}

onMounted(refresh);

// Le contexte WebGL des vignettes ne sert plus une fois la page quittée, et il
// compte dans le quota du navigateur — que les aperçus vivants des autres
// écrans (partie, éditeur) vont réclamer juste après.
onUnmounted(releaseThumbnailRenderer);

function handleEdit() {
  if (selectedId.value) router.push({ path: "/creatif", query: { load: selectedId.value } });
}

function handlePreview() {
  previewedId.value = selectedId.value;
  selectedId.value = null;
}

async function handleDelete() {
  const id = selectedId.value;
  selectedId.value = null;
  if (!auth.session || !id) return;
  if (await deleteMyMap(auth.session.token, id)) await refresh();
}

function handleExport() {
  if (selected.value) exportMapAsFile(selected.value);
  selectedId.value = null;
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

    <!-- Deux colonnes : à une seule, la vignette est plus grande mais on ne
         voit qu'une carte et demie par écran, et « Mes cartes » devient un
         défilement. À trois, le plateau n'est plus qu'une silhouette. -->
    <div v-if="savedMaps.length > 0" class="grid grid-cols-2 gap-3 overflow-y-auto pb-2">
      <MapCard v-for="map in savedMaps" :key="map.id" :map="map" @open="selectedId = map.id" />
    </div>

    <p v-else-if="auth.session" class="text-center text-xs text-ink/40">
      Aucune carte enregistrée pour l'instant.
    </p>

    <MapActionSheet
      v-if="selected"
      :map="selected"
      @close="selectedId = null"
      @edit="handleEdit"
      @preview="handlePreview"
      @export="handleExport"
      @delete="handleDelete"
    />

    <BoardViewDialog
      v-if="previewed && previewedTiles"
      :width="previewed.width"
      :height="previewed.height"
      :tiles="previewedTiles"
      @close="previewedId = null"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { loadSavedMaps, persistSavedMaps, removeMap } from "../lib/savedMaps.js";
import SavedMapsList from "../components/molecules/SavedMapsList.vue";

const router = useRouter();
const savedMaps = ref(loadSavedMaps());

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
</script>

<template>
  <div class="flex h-full flex-col gap-3 px-4 py-6">
    <div class="flex items-center gap-3">
      <RouterLink to="/creatif" aria-label="Retour" class="text-xl text-white/60">←</RouterLink>
      <h1 class="text-2xl font-bold">Mes cartes</h1>
    </div>

    <SavedMapsList :maps="savedMaps" @load="handleLoad" @delete="handleDelete" />
  </div>
</template>

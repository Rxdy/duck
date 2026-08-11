<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { fetchOfficialMaps, type OfficialMap } from "../lib/mapsApi.js";
import ModeCard from "../components/molecules/ModeCard.vue";
import MapPreviewList from "../components/molecules/MapPreviewList.vue";

/**
 * Les trois modes de la V1 (voir docs/02-gameplay.md#modes-de-jeu). Ils
 * partagent exactement les mêmes règles — seul le nombre de joueurs, donc de
 * bases à éviter et à atteindre, change.
 *
 * Le 2v2 et la partie privée ne sont volontairement PAS listés : annoncer
 * "Bientôt" sur la moitié de l'écran donne l'impression d'un jeu vide, et
 * ils reviendront quand ils existeront. L'entraînement, lui, reste
 * accessible là où il a du sens — le bouton "Tester" de l'éditeur (voir
 * pages/Creative.vue).
 */
const modes = [
  { key: "duel", label: "Duel", desc: "1v1, premier à 15 points", players: 2, ready: true },
  {
    key: "ffa3",
    label: "FFA 3 joueurs",
    desc: "1v1v1, premier à 15 points",
    players: 3,
    ready: true,
  },
  {
    key: "ffa4",
    label: "FFA 4 joueurs",
    desc: "1v1v1v1, premier à 15 points",
    players: 4,
    ready: true,
  },
];

const officialMaps = ref<OfficialMap[]>([]);
onMounted(async () => {
  officialMaps.value = await fetchOfficialMaps();
});

/**
 * Un seul mode déplié à la fois : chaque aperçu ouvre un contexte WebGL, et
 * les afficher tous en ferait sauter (voir MapPreviewList.vue).
 */
const expanded = ref<string | null>(null);
function toggle(key: string) {
  expanded.value = expanded.value === key ? null : key;
}

const mapsByMode = computed(() => {
  const grouped = new Map<number, OfficialMap[]>();
  for (const map of officialMaps.value) {
    grouped.set(map.players, [...(grouped.get(map.players) ?? []), map]);
  }
  return grouped;
});
</script>

<template>
  <div class="mx-auto flex h-full max-w-md flex-col gap-4 overflow-y-auto px-4 py-6">
    <h1 class="text-2xl font-bold">Jouer</h1>

    <div v-for="mode in modes" :key="mode.key" class="flex flex-col gap-2">
      <ModeCard
        :label="mode.label"
        :description="mode.desc"
        :ready="mode.ready"
        :to="`/jeu?mode=${mode.key}`"
      />

      <button
        type="button"
        class="self-start text-xs text-cyan-400"
        :aria-expanded="expanded === mode.key"
        @click="toggle(mode.key)"
      >
        {{ expanded === mode.key ? "Masquer les cartes" : "Voir les cartes" }}
      </button>

      <MapPreviewList v-if="expanded === mode.key" :maps="mapsByMode.get(mode.players) ?? []" />
    </div>
  </div>
</template>

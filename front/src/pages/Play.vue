<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { fetchOfficialMaps, type OfficialMap } from "../lib/mapsApi.js";
import ModeCard from "../components/molecules/ModeCard.vue";
import ModalDialog from "../components/molecules/ModalDialog.vue";
import RuleList from "../components/molecules/RuleList.vue";
import { DUCK_IMAGES } from "../lib/ducks.js";
import MapPreviewList from "../components/molecules/MapPreviewList.vue";

/**
 * Les deux modes de la V1 (voir docs/02-gameplay.md#modes-de-jeu). Ils
 * partagent exactement les mêmes règles — seul le nombre de joueurs, donc de
 * bases à éviter et à atteindre, change.
 *
 * Pas de FFA à 3 : les plateaux ont quatre côtés, un format à trois laisserait
 * un joueur mieux placé que les autres.
 *
 * Le 2v2 et la partie privée ne sont volontairement PAS listés : annoncer
 * "Bientôt" sur la moitié de l'écran donne l'impression d'un jeu vide, et
 * ils reviendront quand ils existeront.
 */
const modes = [
  {
    key: "duel",
    label: "Duel",
    desc: "1v1 : toi contre un seul adversaire.",
    players: 2,
    ducks: [DUCK_IMAGES.rouge, DUCK_IMAGES.cyan],
    focus: "Une base à attaquer",
  },
  {
    key: "ffa4",
    label: "FFA 4 joueurs",
    desc: "1v1v1v1 : la mêlée générale.",
    players: 4,
    ducks: [DUCK_IMAGES.rouge, DUCK_IMAGES.cyan, DUCK_IMAGES.jaune, DUCK_IMAGES.vert],
    focus: "Trois bases à attaquer",
  },
];

const officialMaps = ref<OfficialMap[]>([]);
onMounted(async () => {
  officialMaps.value = await fetchOfficialMaps();
});

const mapsByMode = computed(() => {
  const grouped = new Map<number, OfficialMap[]>();
  for (const map of officialMaps.value) {
    grouped.set(map.players, [...(grouped.get(map.players) ?? []), map]);
  }
  return grouped;
});

function details(mode: (typeof modes)[number]) {
  const count = mapsByMode.value.get(mode.players)?.length ?? 0;
  return [
    { icon: "ri-group-fill", text: `${mode.players} joueurs` },
    { icon: "ri-flag-fill", text: mode.focus },
    { icon: "ri-trophy-fill", text: "15 points" },
    ...(count > 0
      ? [{ icon: "ri-map-2-fill", text: `${count} carte${count > 1 ? "s" : ""}` }]
      : []),
  ];
}

/**
 * Une seule fenêtre à la fois, et une seule carte affichée dedans : chaque aperçu
 * ouvre un contexte WebGL (voir MapPreviewList.vue).
 */
const dialog = ref<{ kind: "maps" | "rules"; mode: (typeof modes)[number] } | null>(null);
</script>

<template>
  <div
    class="mx-auto flex h-full max-w-md flex-col gap-3 overflow-y-auto px-3 py-3 tiny:gap-2 tiny:py-2 short:max-w-4xl short:gap-2 short:py-2 lg:max-w-3xl lg:justify-center"
  >
    <div class="flex items-center justify-between gap-3">
      <h1 class="text-2xl font-bold">Jouer</h1>
      <RouterLink
        to="/entrainement"
        class="panel flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold"
      >
        <i class="accent-icon ri-graduation-cap-fill" aria-hidden="true" />
        Camp d'entraînement
      </RouterLink>
    </div>

    <div class="grid grid-cols-1 gap-3 tiny:gap-2 short:grid-cols-2 short:gap-2 lg:grid-cols-2">
      <ModeCard
        v-for="mode in modes"
        :key="mode.key"
        :label="mode.label"
        :description="mode.desc"
        :ready="true"
        :to="`/jeu?mode=${mode.key}`"
        :ducks="mode.ducks"
        :details="details(mode)"
        class="lg:min-h-64"
        @maps="dialog = { kind: 'maps', mode }"
        @rules="dialog = { kind: 'rules', mode }"
      />
    </div>

    <ModalDialog
      v-if="dialog"
      :title="`${dialog.mode.label} · ${dialog.kind === 'maps' ? 'cartes' : 'règles'}`"
      @close="dialog = null"
    >
      <MapPreviewList
        v-if="dialog.kind === 'maps'"
        :maps="mapsByMode.get(dialog.mode.players) ?? []"
      />
      <RuleList v-else />
    </ModalDialog>
  </div>
</template>

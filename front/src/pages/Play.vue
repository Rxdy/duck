<script setup lang="ts">
import ModeCard from "../components/molecules/ModeCard.vue";

const modes = [
  { key: "duel", label: "Duel", desc: "2 joueurs, premier à 5 points", ready: true },
  {
    key: "2v2",
    label: "2v2",
    desc: "Duel en équipe, 4 joueurs, une base par équipe",
    ready: false,
  },
  { key: "ffa3", label: "FFA 3 joueurs", desc: "Chacun sa base, chacun son spawn", ready: false },
  { key: "ffa4", label: "FFA 4 joueurs", desc: "Chacun sa base, chacun son spawn", ready: false },
  {
    key: "prive",
    label: "Partie privée",
    desc: "Salle avec code d'invitation à partager",
    ready: false,
  },
  {
    key: "entrainement",
    label: "Entraînement",
    desc: "Seul, sans score, pour tester une carte",
    ready: true,
  },
];
</script>

<template>
  <div class="mx-auto flex h-full max-w-md flex-col gap-4 overflow-y-auto px-4 py-6">
    <h1 class="text-2xl font-bold">Jouer</h1>

    <ModeCard
      v-for="mode in modes"
      :key="mode.key"
      :label="mode.label"
      :description="mode.desc"
      :ready="mode.ready"
    />
  </div>
</template>

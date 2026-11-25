<script setup lang="ts">
import type { PlayerState } from "../../types.js";

// `meId` : son propre score s'intitule « Toi », repérable d'un coup d'œil.
defineProps<{ players: PlayerState[]; meId?: string }>();

// Ordre d'arrivée -> coin d'écran : 4 joueurs max (Duel/FFA), un par coin.
const CORNERS = [
  {
    name: "top-left",
    classes: "corners:left-3 corners:top-3",
  },
  {
    name: "top-right",
    classes: "corners:right-3 corners:top-3",
  },
  {
    name: "bottom-left",
    classes: "corners:bottom-3 corners:left-3",
  },
  {
    name: "bottom-right",
    classes: "corners:bottom-3 corners:right-3",
  },
] as const;
</script>

<template>
  <!-- Sur téléphone, les scores sont en haut, sur deux colonnes : en bas, les
       doigts qui jouent les cachaient. Sur grand écran, un par coin. -->
  <div
    class="pointer-events-none absolute inset-x-3 top-3 z-10 grid grid-cols-2 gap-2 short:top-1 short:grid-cols-4 corners:contents"
  >
    <div
      v-for="(player, index) in players.slice(0, 4)"
      :key="player.id"
      :data-corner="CORNERS[index]!.name"
      class="panel flex min-w-0 items-center justify-between gap-2 rounded-xl px-3 py-2 short:py-1 corners:absolute corners:z-10 corners:min-w-40"
      :class="CORNERS[index]!.classes"
    >
      <span
        class="flex min-w-0 items-center gap-1.5 text-xs font-semibold"
        :style="{ color: player.color }"
      >
        <span
          class="h-2.5 w-2.5 shrink-0 rounded-full"
          :style="{ backgroundColor: player.color }"
        />
        <span class="truncate">{{ player.id === meId ? "Toi" : player.name }}</span>
      </span>
      <span class="text-base font-bold tabular-nums text-ink">{{ player.score }}</span>
    </div>
  </div>
</template>

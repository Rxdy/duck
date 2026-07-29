<script setup lang="ts">
import type { PlayerState } from "../../types.js";

defineProps<{ players: PlayerState[] }>();

// Ordre d'arrivée -> coin d'écran : 4 joueurs max (Duel/FFA), un par coin.
const CORNERS = [
  { name: "top-left", classes: "left-3 top-3 items-start text-left" },
  { name: "top-right", classes: "right-3 top-3 items-end text-right" },
  { name: "bottom-left", classes: "bottom-3 left-3 items-start text-left" },
  { name: "bottom-right", classes: "bottom-3 right-3 items-end text-right" },
] as const;
</script>

<template>
  <div
    v-for="(player, index) in players.slice(0, 4)"
    :key="player.id"
    :data-corner="CORNERS[index]!.name"
    class="absolute z-10 flex flex-col gap-0.5 rounded-lg bg-slate-900/80 px-3 py-1.5"
    :class="CORNERS[index]!.classes"
  >
    <span class="flex items-center gap-1.5 text-xs font-semibold" :style="{ color: player.color }">
      <span class="h-2.5 w-2.5 shrink-0 rounded-full" :style="{ backgroundColor: player.color }" />
      {{ player.name }}
    </span>
    <span class="text-lg font-bold text-white">{{ player.score }}</span>
  </div>
</template>

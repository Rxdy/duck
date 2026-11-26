<script setup lang="ts">
import type { RankedPlayer } from "../../lib/rankingApi.js";
import DuckPortrait from "../atoms/DuckPortrait.vue";

defineProps<{ player: RankedPlayer; highlight?: boolean }>();
</script>

<template>
  <li
    class="relative flex max-h-14 min-h-0 flex-1 items-center gap-3 overflow-hidden rounded-lg px-3"
    :class="highlight ? 'border border-cyan-500 bg-cyan-500/15' : 'panel'"
  >
    <span class="w-8 shrink-0 text-sm tabular-nums text-ink/60">{{ player.rank }}</span>
    <DuckPortrait :outfit="player.outfit" class="h-full max-h-12 w-10 shrink-0 py-0.5" />
    <span class="relative flex-1 truncate text-sm font-semibold">
      {{ player.username }}
      <span v-if="highlight" class="ml-1 text-xs font-normal text-cyan-400">(toi)</span>
    </span>
    <span class="relative shrink-0 text-sm font-bold tabular-nums text-ink/70">
      {{ player.rating }}
    </span>
  </li>
</template>

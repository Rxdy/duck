<script setup lang="ts">
import { computed } from "vue";
import {
  didWin,
  formatDuration,
  formatPlayedAt,
  modeLabel,
  type MatchRecap,
} from "../../lib/matchHistory.js";

/**
 * Une partie du récapitulatif de la page Compte.
 *
 * Le nom de la carte n'y figure pas : il ne dit rien de la partie qu'on
 * cherche à retrouver, alors que le mode, l'heure, la durée et le tableau des
 * scores la reconnaissent immédiatement.
 */
const props = defineProps<{ match: MatchRecap }>();

const won = computed(() => didWin(props.match));
const mode = computed(() => modeLabel(props.match.mode, props.match.players.length));
const when = computed(() => formatPlayedAt(props.match.playedAt));
const duration = computed(() => formatDuration(props.match.durationMs));
</script>

<template>
  <!-- Surface et bordure propres, pas `bg-surface` : la section qui les
       contient porte déjà cette couleur, et des cartes de la même teinte que
       leur fond ne se lisent plus comme des cartes. -->
  <article class="flex flex-col gap-2 rounded-xl border border-ink/10 bg-ink/5 p-3">
    <header class="flex items-baseline justify-between gap-2">
      <h3 class="text-sm font-semibold">{{ mode }}</h3>
      <span
        class="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
        :class="won ? 'bg-emerald-500/15 text-emerald-400' : 'bg-ink/10 text-ink/50'"
      >
        {{ won ? "Victoire" : "Défaite" }}
      </span>
    </header>

    <p class="flex items-center gap-1.5 text-xs text-ink/50">
      <i class="ri-time-line" aria-hidden="true" />
      <span>{{ when }}</span>
      <span aria-hidden="true">·</span>
      <!-- Titre explicite : "2 min 05 s" seul, à côté d'une heure, se lit
           aussi bien comme une seconde heure. -->
      <span title="Durée de la partie">{{ duration }}</span>
    </p>

    <ul class="flex flex-col gap-1">
      <li
        v-for="player in match.players"
        :key="`${player.name}-${player.score}`"
        class="flex items-center gap-2 text-sm"
        :class="player.isMe ? 'font-semibold text-ink' : 'text-ink/60'"
      >
        <span
          class="h-2.5 w-2.5 shrink-0 rounded-full"
          :style="{ backgroundColor: player.color }"
          aria-hidden="true"
        />
        <span class="truncate">{{ player.name }}</span>
        <span v-if="player.isMe" class="shrink-0 text-xs font-normal text-ink/40">(toi)</span>
        <span class="ml-auto shrink-0 tabular-nums">{{ player.score }}</span>
      </li>
    </ul>
  </article>
</template>

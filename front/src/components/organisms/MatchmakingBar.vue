<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { leaveMatch } from "../../lib/matchSession.js";
import { useGameStore } from "../../store/gameStore.js";

/**
 * La recherche en cours, visible sur toutes les pages : on y suit la file, on en
 * sort, et la partie s'ouvre d'elle-même quand elle démarre.
 */
const MODE_LABELS = { duel: "Duel", ffa4: "FFA 4 joueurs" } as const;

const store = useGameStore();
const route = useRoute();
const router = useRouter();

const searching = computed(() => store.queue !== null && store.playableAt === null);

watch(
  () => store.queue !== null && store.playableAt !== null,
  (started) => {
    if (started && route.name !== "game") void router.push("/jeu");
  },
);

// L'entraînement sur une carte à soi ouvre sa propre partie : il met fin à la recherche.
watch(
  () => route.name,
  (name) => {
    if (name === "test-game" && store.queue) leaveMatch();
  },
);

// Le serveur n'envoie WAITING qu'aux arrivées : le décompte s'égrène ici.
const msLeft = ref(0);
let ticker: ReturnType<typeof setInterval> | undefined;
watch(
  () => store.waiting,
  (waiting) => {
    clearInterval(ticker);
    msLeft.value = waiting?.startsInMs ?? 0;
    if (waiting) ticker = setInterval(() => (msLeft.value = Math.max(0, msLeft.value - 250)), 250);
  },
  { immediate: true },
);
onUnmounted(() => clearInterval(ticker));

const seconds = computed(() => Math.ceil(msLeft.value / 1000));
</script>

<template>
  <div
    v-if="searching && route.name !== 'game'"
    role="status"
    class="panel mx-2 mt-2 flex shrink-0 items-center gap-3 rounded-xl !border-cyan-500/60 px-3 py-2"
  >
    <i
      v-if="!store.error"
      class="ri-loader-4-line animate-spin text-xl text-cyan-400"
      aria-hidden="true"
    />
    <i v-else class="ri-error-warning-line text-xl text-amber-400" aria-hidden="true" />
    <p class="min-w-0 flex-1 text-sm leading-tight">
      <span class="block truncate font-bold">
        {{ store.error ?? `Recherche · ${MODE_LABELS[store.queue!.mode]}` }}
      </span>
      <span v-if="!store.error && store.waiting" class="block truncate text-xs text-ink/60">
        {{ store.players.length }}/{{ store.waiting.capacity }} joueurs
        <template v-if="seconds > 0">· départ dans {{ seconds }} s au plus</template>
      </span>
    </p>
    <button
      type="button"
      class="shrink-0 rounded-lg bg-ink/10 px-3 py-2 text-xs font-semibold"
      @click="leaveMatch"
    >
      {{ store.error ? "Fermer" : "Annuler" }}
    </button>
  </div>
</template>

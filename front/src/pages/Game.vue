<script setup lang="ts">
import { computed } from "vue";
import { useGameStore } from "../store/gameStore.js";
import { useSettingsStore } from "../store/settingsStore.js";
import { useAuthStore } from "../store/authStore.js";
import { useGameSocket } from "../composables/useGameSocket.js";
import { useKeyboardControls } from "../composables/useKeyboardControls.js";
import { resolvePlayerColor } from "../lib/colorblind.js";
import { wireTileToKind } from "../lib/mapEditor.js";
import BoardPreview from "../components/organisms/BoardPreview.vue";
import TapZoneControls from "../components/organisms/TapZoneControls.vue";
import ScoreHud from "../components/organisms/ScoreHud.vue";

const store = useGameStore();
const settings = useSettingsStore();
const auth = useAuthStore();
// Pseudo du compte si connecté, sinon un nom générique — jamais "Player" en
// dur, qui s'affichait toujours à la place du vrai pseudo.
const { move } = useGameSocket("lobby", auth.session?.username ?? "Joueur");
useKeyboardControls(move);

// Fallback inerte le temps que le message MAP arrive (juste après le JOIN) :
// évite un flash de damier 1x1 disproportionné avant que la vraie carte soit connue.
const FALLBACK_SIZE = 12;

const placedTiles = computed(
  () =>
    store.map?.tiles.flatMap((row, y) =>
      row.map((kind, x) => ({ x, y, kind: wireTileToKind(kind) })),
    ) ?? [],
);

const displayPlayers = computed(() =>
  store.players.map((player) => ({
    ...player,
    color: resolvePlayerColor(player.color, settings.colorblindMode),
  })),
);

const winner = computed(() => displayPlayers.value.find((p) => p.id === store.winnerId));
</script>

<template>
  <div class="relative h-full w-full">
    <BoardPreview
      :width="store.map?.width ?? FALLBACK_SIZE"
      :height="store.map?.height ?? FALLBACK_SIZE"
      :tiles="placedTiles"
      :players="displayPlayers"
    />
    <ScoreHud :players="displayPlayers" />
    <TapZoneControls
      :haptics-enabled="settings.hapticsEnabled"
      :reduced-motion="settings.reducedMotion"
      @move="move"
    />

    <div
      v-if="winner"
      class="absolute inset-0 z-20 flex flex-col items-center justify-center gap-6 bg-slate-950/90 text-center"
    >
      <RouterLink
        to="/jouer"
        aria-label="Fermer"
        class="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/70"
      >
        ✕
      </RouterLink>

      <p class="text-sm uppercase tracking-widest text-white/50">Partie terminée</p>

      <div class="flex w-full max-w-xs flex-col gap-2">
        <div
          v-for="player in displayPlayers"
          :key="player.id"
          class="flex items-center justify-between gap-6 rounded-lg px-4 py-2"
          :class="player.id === winner.id ? 'bg-white/10' : ''"
        >
          <span class="flex items-center gap-2 text-sm font-semibold">
            <span
              class="h-3 w-3 shrink-0 rounded-full"
              :style="{ backgroundColor: player.color }"
            />
            {{ player.name }}
          </span>
          <span class="text-lg font-bold">{{ player.score }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

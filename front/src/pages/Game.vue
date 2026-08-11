<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { useGameStore } from "../store/gameStore.js";
import { useSettingsStore } from "../store/settingsStore.js";
import { useAuthStore } from "../store/authStore.js";
import { useGameSocket } from "../composables/useGameSocket.js";
import { useKeyboardControls } from "../composables/useKeyboardControls.js";
import { resolvePlayerColor } from "../lib/colorblind.js";
import { wireTileToKind } from "../lib/mapEditor.js";
import type { BotLevel, GameMode } from "../types.js";

// Modes acceptés dans l'URL (voir pages/Play.vue).
const MODES: GameMode[] = ["duel", "ffa3", "ffa4"];
const BOT_LEVELS: BotLevel[] = ["debutant", "intermediaire", "confirme", "expert", "impossible"];
import AppButton from "../components/atoms/AppButton.vue";
import BoardPreview from "../components/organisms/BoardPreview.vue";
import TapZoneControls from "../components/organisms/TapZoneControls.vue";
import ScoreHud from "../components/organisms/ScoreHud.vue";

const route = useRoute();
const store = useGameStore();
const settings = useSettingsStore();
const auth = useAuthStore();
// Pseudo du compte si connecté, sinon un nom générique — jamais "Player" en
// dur, qui s'affichait toujours à la place du vrai pseudo.
// Mode choisi dans /jouer (voir pages/Play.vue). Valeur inattendue (URL
// tapée à la main) -> duel, plutôt qu'un JOIN que le serveur refuserait.
const mode = MODES.includes(route.query.mode as GameMode) ? (route.query.mode as GameMode) : "duel";
// Niveau des bots forçable depuis l'URL (?bot=expert) : de quoi comparer une
// partie contre chaque niveau sans redémarrer le serveur. Absent -> le niveau
// par défaut du serveur.
const botLevel = BOT_LEVELS.includes(route.query.bot as BotLevel)
  ? (route.query.bot as BotLevel)
  : undefined;
const { move, restart } = useGameSocket(
  "lobby",
  auth.session?.username ?? "Joueur",
  mode,
  botLevel,
);
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

// Classement de fin de partie : par score décroissant, le vainqueur devant en
// cas d'égalité (il a atteint le score requis en premier). Le HUD en jeu, lui,
// garde l'ordre d'arrivée — un tableau qui se réordonne à chaque point rendrait
// impossible de suivre son propre score du coin de l'œil.
const rankedPlayers = computed(() =>
  [...displayPlayers.value].sort(
    (a, b) =>
      b.score - a.score ||
      Number(b.id === store.winnerId) - Number(a.id === store.winnerId) ||
      a.name.localeCompare(b.name),
  ),
);
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
      class="absolute inset-0 z-20 flex flex-col items-center justify-center gap-6 bg-surface-deep/90 text-center"
    >
      <RouterLink
        to="/jouer"
        aria-label="Fermer"
        class="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-ink/10 text-ink/70"
      >
        ✕
      </RouterLink>

      <p class="text-sm uppercase tracking-widest text-ink/50">Partie terminée</p>

      <div class="flex w-full max-w-xs flex-col gap-2">
        <div
          v-for="(player, rank) in rankedPlayers"
          :key="player.id"
          class="flex items-center justify-between gap-6 rounded-lg px-4 py-2"
          :class="player.id === winner.id ? 'bg-ink/10' : ''"
        >
          <span class="flex items-center gap-2 text-sm font-semibold">
            <span class="w-4 text-ink/40">{{ rank + 1 }}</span>
            <span
              class="h-3 w-3 shrink-0 rounded-full"
              :style="{ backgroundColor: player.color }"
            />
            {{ player.name }}
          </span>
          <span class="text-lg font-bold">{{ player.score }}</span>
        </div>
      </div>

      <div class="flex w-full max-w-xs gap-2">
        <AppButton class="flex-1" variant="primary" @click="restart">Rejouer</AppButton>
        <AppButton class="flex-1" to="/jouer">Changer de mode</AppButton>
      </div>
    </div>
  </div>
</template>

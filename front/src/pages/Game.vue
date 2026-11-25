<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useGameStore } from "../store/gameStore.js";
import { useSettingsStore } from "../store/settingsStore.js";
import { leaveMatch, searchMatch, sendMove } from "../lib/matchSession.js";
import { useKeyboardControls } from "../composables/useKeyboardControls.js";
import { resolvePlayerColor } from "../lib/colorblind.js";
import { wireTileToKind } from "../lib/mapEditor.js";
import type { BotLevel, GameMode } from "../types.js";

// Modes acceptés dans l'URL (voir pages/Play.vue).
const MODES: GameMode[] = ["duel", "ffa4"];
const BOT_LEVELS: BotLevel[] = ["debutant", "intermediaire", "confirme", "expert", "impossible"];
import AppButton from "../components/atoms/AppButton.vue";
import MiniMap from "../components/molecules/MiniMap.vue";
import CountdownOverlay from "../components/molecules/CountdownOverlay.vue";
import { useCountdown } from "../composables/useCountdown.js";
import { useCloseUp } from "../composables/useCloseUp.js";
import type { ScreenPoint } from "../lib/touchZones.js";
import BoardPreview from "../components/organisms/BoardPreview.vue";
import GameStage from "../components/organisms/GameStage.vue";
import ScoreHud from "../components/organisms/ScoreHud.vue";

const route = useRoute();
const store = useGameStore();
const settings = useSettingsStore();
const router = useRouter();
// Niveau des bots forçable depuis l'URL (?bot=expert) : de quoi comparer une
// partie contre chaque niveau sans redémarrer le serveur. Absent -> le niveau
// par défaut du serveur.
const botLevel = BOT_LEVELS.includes(route.query.bot as BotLevel)
  ? (route.query.bot as BotLevel)
  : undefined;
// Cette page AFFICHE la partie ; la connexion et la recherche vivent dans
// lib/matchSession.ts. Arrivée par une carte de mode (/jeu?mode=...) : on lance
// la recherche et on rend la main sur l'accueil.
const started = computed(() => store.queue !== null && store.playableAt !== null);
const asked = MODES.includes(route.query.mode as GameMode)
  ? (route.query.mode as GameMode)
  : undefined;
if (!started.value) {
  if (asked) searchMatch(asked, botLevel);
  if (asked || !store.queue) void router.replace("/");
}

const move = sendMove;

function restart() {
  const queue = store.queue;
  if (!queue) return;
  searchMatch(queue.mode, queue.botLevel);
  void router.push("/");
}

// Quitter l'écran d'une partie commencée, c'est la quitter.
onBeforeUnmount(() => {
  if (started.value) leaveMatch();
});
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

const closeUp = useCloseUp(() => store.playableAt !== null);
const countdown = useCountdown(() => store.playableAt);

const duckOnScreen = ref<ScreenPoint>();

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
  <div v-if="started" class="relative h-full w-full">
    <GameStage :anchor="duckOnScreen" @move="move">
      <BoardPreview
        :width="store.map?.width ?? FALLBACK_SIZE"
        :height="store.map?.height ?? FALLBACK_SIZE"
        :tiles="placedTiles"
        :players="displayPlayers"
        :close-up="closeUp"
        @follow-moved="duckOnScreen = $event"
        :follow-id="store.playerId ?? undefined"
      />
      <template #overlay>
        <ScoreHud :players="displayPlayers" :me-id="store.playerId ?? undefined" />
        <MiniMap
          v-if="closeUp"
          :width="store.map?.width ?? FALLBACK_SIZE"
          :height="store.map?.height ?? FALLBACK_SIZE"
          :tiles="placedTiles"
          :players="displayPlayers"
          :me-id="store.playerId ?? undefined"
        />
        <CountdownOverlay
          :label="countdown.label.value"
          :anchor="duckOnScreen"
          :on-duck="closeUp"
        />
      </template>
    </GameStage>

    <div
      v-if="winner"
      class="absolute inset-0 z-20 flex flex-col items-center gap-6 overflow-y-auto bg-surface-deep/90 px-4 py-6 text-center [justify-content:safe_center] short:gap-3 short:py-3"
    >
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

      <div class="flex w-full max-w-xs flex-col gap-2">
        <div class="flex gap-2">
          <AppButton class="flex-1" variant="primary" @click="restart">Rejouer</AppButton>
          <AppButton class="flex-1" to="/jouer">Changer de mode</AppButton>
        </div>
        <AppButton class="text-center" to="/">Quitter</AppButton>
      </div>
    </div>
  </div>
</template>

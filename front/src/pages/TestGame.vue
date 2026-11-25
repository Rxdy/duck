<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { useGameStore } from "../store/gameStore.js";
import { useSettingsStore } from "../store/settingsStore.js";
import { useTestSessionStore } from "../store/testSessionStore.js";
import { useTestGameSocket } from "../composables/useTestGameSocket.js";
import { toPlacedTiles } from "../lib/mapEditor.js";
import { resolvePlayerColor } from "../lib/colorblind.js";
import MiniMap from "../components/molecules/MiniMap.vue";
import CountdownOverlay from "../components/molecules/CountdownOverlay.vue";
import { useCountdown } from "../composables/useCountdown.js";
import { useCloseUp } from "../composables/useCloseUp.js";
import type { ScreenPoint } from "../lib/touchZones.js";
import BoardPreview from "../components/organisms/BoardPreview.vue";
import GameStage from "../components/organisms/GameStage.vue";
import ScoreHud from "../components/organisms/ScoreHud.vue";

const router = useRouter();
const testSession = useTestSessionStore();
const store = useGameStore();
const settings = useSettingsStore();

// Arrivée directe sans être passé par le bouton "Tester" de /creatif : rien à
// tester, on renvoie vers l'éditeur plutôt que d'afficher un écran cassé.
if (!testSession.map) {
  router.replace("/creatif");
}

// Fallback inerte le temps que la redirection ci-dessus prenne effet.
const { move } = useTestGameSocket(testSession.map ?? { width: 1, height: 1, tiles: [["empty"]] });

// Les murs/spawns de la carte doivent être rendus (sinon le contour ressemble
// à un sol normal, alors qu'on ne peut pas y marcher).
const placedTiles = computed(() => (testSession.map ? toPlacedTiles(testSession.map) : []));

const closeUp = useCloseUp(() => store.playableAt !== null);
const countdown = useCountdown(() => store.playableAt);

const duckOnScreen = ref<ScreenPoint>();

const displayPlayers = computed(() =>
  store.players.map((player) => ({
    ...player,
    color: resolvePlayerColor(player.color, settings.colorblindMode),
  })),
);
</script>

<template>
  <div v-if="testSession.map" class="relative h-full w-full">
    <div
      class="absolute left-1/2 top-28 z-10 short:top-14 flex w-max -translate-x-1/2 items-center gap-2 corners:top-3"
    >
      <span class="rounded-full bg-surface/80 px-4 py-1 text-xs text-ink/70">
        Mode entraînement — carte test
      </span>
      <RouterLink to="/creatif" class="rounded-full bg-surface/80 px-3 py-1 text-xs text-ink/70">
        Quitter
      </RouterLink>
    </div>

    <GameStage :anchor="duckOnScreen" @move="move">
      <BoardPreview
        :width="testSession.map.width"
        :height="testSession.map.height"
        :tiles="placedTiles"
        :players="displayPlayers"
        :close-up="closeUp"
        @follow-moved="duckOnScreen = $event"
        :follow-id="store.players[0]?.id"
      />
      <template #overlay>
        <ScoreHud :players="displayPlayers" :me-id="store.players[0]?.id" />
        <MiniMap
          v-if="closeUp"
          :width="testSession.map.width"
          :height="testSession.map.height"
          :tiles="placedTiles"
          :players="displayPlayers"
          :me-id="store.players[0]?.id"
        />
        <CountdownOverlay
          :label="countdown.label.value"
          :anchor="duckOnScreen"
          :on-duck="closeUp"
        />
      </template>
    </GameStage>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import { useGameStore } from "../store/gameStore.js";
import { useSettingsStore } from "../store/settingsStore.js";
import { useTestSessionStore } from "../store/testSessionStore.js";
import { useTestGameSocket } from "../composables/useTestGameSocket.js";
import { toPlacedTiles } from "../lib/mapEditor.js";
import { resolvePlayerColor } from "../lib/colorblind.js";
import BoardPreview from "../components/organisms/BoardPreview.vue";
import TapZoneControls from "../components/organisms/TapZoneControls.vue";
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

const displayPlayers = computed(() =>
  store.players.map((player) => ({
    ...player,
    color: resolvePlayerColor(player.color, settings.colorblindMode),
  })),
);
</script>

<template>
  <div v-if="testSession.map" class="relative h-full w-full">
    <div class="absolute left-1/2 top-3 z-10 flex -translate-x-1/2 items-center gap-2">
      <span class="rounded-full bg-slate-900/80 px-4 py-1 text-xs text-white/70">
        Mode entraînement — carte test
      </span>
      <RouterLink
        to="/creatif"
        class="rounded-full bg-slate-900/80 px-3 py-1 text-xs text-white/70"
      >
        Quitter
      </RouterLink>
    </div>

    <BoardPreview
      :width="testSession.map.width"
      :height="testSession.map.height"
      :tiles="placedTiles"
      :players="displayPlayers"
    />
    <ScoreHud :players="displayPlayers" />
    <TapZoneControls
      :haptics-enabled="settings.hapticsEnabled"
      :reduced-motion="settings.reducedMotion"
      @move="move"
    />
  </div>
</template>

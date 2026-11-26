<script setup lang="ts">
import { computed, ref, shallowRef } from "vue";
import MiniMap from "../components/molecules/MiniMap.vue";
import CountdownOverlay from "../components/molecules/CountdownOverlay.vue";
import { useCountdown } from "../composables/useCountdown.js";
import { COUNTDOWN_MS } from "../lib/countdown.js";
import BoardPreview from "../components/organisms/BoardPreview.vue";
import GameStage from "../components/organisms/GameStage.vue";
import { useCloseUp } from "../composables/useCloseUp.js";
import { useKeyboardControls } from "../composables/useKeyboardControls.js";
import { resolvePlayerColor } from "../lib/colorblind.js";
import { FREE_MAP, roomName } from "../lib/freeRoam.js";
import type { TileKind } from "../lib/mapEditor.js";
import { applyStep, createWorld, type Duck } from "../lib/tutorial.js";
import type { ScreenPoint } from "../lib/touchZones.js";
import { useSettingsStore } from "../store/settingsStore.js";
import { useWardrobeStore } from "../store/wardrobeStore.js";
import { RIVAL_OUTFIT } from "../lib/tutorial.js";
import { PLAYER_COLORS } from "../theme.js";
import type { Direction } from "../types.js";
import { createStepPacer } from "../lib/stepPacer.js";

const settings = useSettingsStore();
const wardrobe = useWardrobeStore();
const world = shallowRef(createWorld(FREE_MAP));
const feedback = ref<string>();

// Même départ qu'en partie : la carte, le décompte, puis on joue.
const playableAt = Date.now() + COUNTDOWN_MS;
const countdown = useCountdown(() => playableAt);

// Même rythme qu'en partie : une case entière par pas.
const pacer = createStepPacer(walk);
const move = (direction: Direction) => pacer.push(direction);

function walk(direction: Direction) {
  if (countdown.counting.value) return;
  const outcome = applyStep(world.value, "me", direction, Date.now());
  world.value = outcome.world;
  if (outcome.scored) feedback.value = "+3 points, retour au départ !";
  else if (outcome.tagged) feedback.value = "Touché ! Il retourne à sa place.";
  else feedback.value = undefined;
}
useKeyboardControls(move);

const closeUp = useCloseUp();
const duckOnScreen = ref<ScreenPoint>();

const MARKS: Record<string, TileKind> = { "#": "wall", B: "spawn-1", A: "spawn-0" };
const tiles = FREE_MAP.rows.flatMap((row, y) =>
  [...row].map((mark, x) => ({ x, y, kind: MARKS[mark] ?? ("empty" as TileKind) })),
);

const players = computed(() => {
  const entry = (id: string, duck: Duck, color: string) => ({
    id,
    x: duck.x,
    y: duck.y,
    facing: duck.facing,
    color: resolvePlayerColor(color, settings.colorblindMode),
    immuneForMs: Math.max(0, duck.immuneUntil - Date.now()),
  });
  const list = [{ ...entry("me", world.value.me, PLAYER_COLORS[0]!), outfit: wardrobe.outfit }];
  if (world.value.rival) {
    list.push({ ...entry("rival", world.value.rival, PLAYER_COLORS[1]!), outfit: RIVAL_OUTFIT });
  }
  return list;
});
</script>

<template>
  <GameStage :anchor="duckOnScreen" @move="move">
    <BoardPreview
      :width="FREE_MAP.rows[0]!.length"
      :height="FREE_MAP.rows.length"
      :tiles="tiles"
      :players="players"
      :close-up="closeUp"
      follow-id="me"
      @follow-moved="duckOnScreen = $event"
    />
    <template #overlay>
      <div class="absolute inset-x-3 top-3 z-10 flex items-start justify-between gap-2">
        <div class="panel rounded-xl px-3 py-2">
          <p class="text-sm font-bold">{{ roomName(world.me) }}</p>
          <p class="text-xs text-ink/60">Mode libre · {{ world.me.score }} points</p>
          <p v-if="feedback" role="status" class="text-xs font-semibold text-cyan-400">
            {{ feedback }}
          </p>
        </div>
        <RouterLink to="/entrainement" class="panel rounded-xl px-3 py-2 text-xs font-semibold">
          Quitter
        </RouterLink>
      </div>
      <MiniMap
        v-if="closeUp"
        :width="FREE_MAP.rows[0]!.length"
        :height="FREE_MAP.rows.length"
        :tiles="tiles"
        :players="players"
        me-id="me"
      />
      <CountdownOverlay :label="countdown.label.value" :anchor="duckOnScreen" :on-duck="closeUp" />
    </template>
  </GameStage>
</template>

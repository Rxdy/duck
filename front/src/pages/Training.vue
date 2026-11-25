<script setup lang="ts">
import { computed } from "vue";
import AppButton from "../components/atoms/AppButton.vue";
import BoardPreview from "../components/organisms/BoardPreview.vue";
import DirectionPad from "../components/organisms/DirectionPad.vue";
import { useKeyboardControls } from "../composables/useKeyboardControls.js";
import { useTutorial } from "../composables/useTutorial.js";
import { DUCK_GLOW, DUCK_IMAGES } from "../lib/ducks.js";
import type { TileKind } from "../lib/mapEditor.js";
import { LESSONS, type Duck } from "../lib/tutorial.js";
import { useSettingsStore } from "../store/settingsStore.js";
import { resolvePlayerColor } from "../lib/colorblind.js";
import { PLAYER_COLORS } from "../theme.js";

const settings = useSettingsStore();
const {
  completed,
  phase,
  index,
  taskIndex,
  world,
  lesson,
  task,
  target,
  hint,
  feedback,
  isUnlocked,
  open,
  start,
  move,
  backToMenu,
} = useTutorial();
useKeyboardControls(move);

const TILES: Record<string, TileKind> = { "#": "wall", ".": "empty", A: "spawn-0", B: "spawn-1" };
const tiles = computed(() =>
  world.value.rows.flatMap((row, y) => [...row].map((mark, x) => ({ x, y, kind: TILES[mark]! }))),
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
  const list = [entry("me", world.value.me, PLAYER_COLORS[0]!)];
  if (world.value.rival) list.push(entry("rival", world.value.rival, PLAYER_COLORS[1]!));
  return list;
});

const hasNext = computed(() => index.value + 1 < LESSONS.length);
</script>

<template>
  <!-- Le menu des étapes. -->
  <div
    v-if="phase === 'menu'"
    class="mx-auto flex h-full max-w-md flex-col gap-2.5 overflow-y-auto px-4 py-4 tiny:gap-1.5 tiny:py-2 short:max-w-3xl short:gap-1.5 short:py-2 lg:justify-center"
  >
    <div class="flex items-center gap-3">
      <img
        :src="DUCK_IMAGES.vert"
        :style="{ '--duck-glow': DUCK_GLOW[DUCK_IMAGES.vert] }"
        alt=""
        class="duck-glow h-14 w-14 short:h-10 short:w-10"
      />
      <div>
        <h1 class="text-xl font-bold">Camp d'entraînement</h1>
        <p class="text-xs text-ink/70">
          {{ completed }}/{{ LESSONS.length }} étapes réussies · sans effet sur le classement
        </p>
      </div>
    </div>

    <!-- Deux façons de s'entraîner : explorer librement, ou suivre le tutoriel. -->
    <RouterLink
      to="/entrainement/libre"
      class="flex items-center gap-3 rounded-2xl bg-cyan-500 p-3 text-slate-950 transition active:scale-[0.98] short:p-2"
    >
      <i class="ri-compass-3-fill text-2xl" aria-hidden="true" />
      <span class="min-w-0 flex-1">
        <span class="block font-bold">Mode libre</span>
        <span class="block text-xs text-slate-950/75">
          Une grande carte à quatre salles, sans consigne
        </span>
      </span>
      <i class="ri-arrow-right-s-line text-xl" aria-hidden="true" />
    </RouterLink>

    <h2 class="text-sm font-bold text-ink/70">Tutoriel guidé</h2>

    <ol class="grid grid-cols-1 gap-2.5 tiny:gap-1.5 short:grid-cols-2 short:gap-1.5">
      <li v-for="(item, i) in LESSONS" :key="item.key">
        <button
          type="button"
          class="panel flex w-full items-center gap-3 rounded-2xl p-3 text-left transition enabled:active:scale-[0.98] disabled:opacity-45 tiny:p-2 short:p-2"
          :disabled="!isUnlocked(i)"
          @click="open(i)"
        >
          <span class="w-6 text-center text-xl font-extrabold">{{ i + 1 }}</span>
          <span class="min-w-0 flex-1">
            <span class="block font-bold">{{ item.title }}</span>
            <span class="block truncate text-xs text-ink/60 tiny:hidden">{{ item.summary }}</span>
          </span>
          <i
            class="accent-icon text-xl"
            :class="
              i < completed
                ? 'ri-checkbox-circle-fill'
                : isUnlocked(i)
                  ? 'ri-play-circle-fill'
                  : 'ri-lock-fill'
            "
            :aria-label="i < completed ? 'Réussie' : isUnlocked(i) ? 'À jouer' : 'Verrouillée'"
          />
        </button>
      </li>
    </ol>
  </div>

  <!-- Une étape : le coach, le plateau, les boutons. -->
  <div
    v-else
    :class="[
      'flex h-full flex-col gap-2 p-2',
      phase === 'play'
        ? 'short:grid short:grid-cols-[6rem_minmax(0,1fr)_6rem] short:grid-rows-2'
        : '',
    ]"
  >
    <div
      :class="[
        'flex min-h-0 flex-1 flex-col gap-2',
        phase === 'play'
          ? 'short:col-start-2 short:row-span-2 short:row-start-1'
          : 'short:flex-row',
      ]"
    >
      <div
        class="panel mx-auto flex w-full max-w-xl shrink-0 items-start gap-2 rounded-2xl p-2.5 short:w-2/5 short:self-center"
        aria-live="polite"
      >
        <img
          :src="DUCK_IMAGES.vert"
          :style="{ '--duck-glow': DUCK_GLOW[DUCK_IMAGES.vert] }"
          alt=""
          class="duck-glow h-12 w-12 short:h-9 short:w-9"
        />
        <div class="min-w-0 flex-1">
          <p class="flex items-center justify-between gap-2 text-[11px] text-ink/60">
            <span>Étape {{ index + 1 }}/{{ LESSONS.length }} · {{ lesson.title }}</span>
            <button
              type="button"
              class="-my-2 -mr-2 px-3 py-2 font-semibold underline"
              @click="backToMenu"
            >
              Menu
            </button>
          </p>
          <p class="text-sm font-semibold tiny:text-xs short:text-xs">
            {{
              phase === "intro" ? lesson.intro : phase === "success" ? lesson.success : task.text
            }}
          </p>
          <p v-if="phase === 'play' && lesson.tasks.length > 1" class="text-[11px] text-ink/50">
            Consigne {{ taskIndex + 1 }}/{{ lesson.tasks.length }}
          </p>
          <p v-if="feedback" class="text-xs font-bold">
            {{ feedback }}
          </p>
          <div v-if="phase !== 'play'" class="mt-1.5 flex flex-wrap gap-2">
            <AppButton v-if="phase === 'intro'" variant="primary" @click="start">
              C'est parti
            </AppButton>
            <template v-else>
              <AppButton v-if="hasNext" variant="primary" @click="open(index + 1)">
                Étape suivante
              </AppButton>
              <AppButton v-else variant="primary" to="/jouer">Jouer une vraie partie</AppButton>
              <AppButton @click="open(index)">Rejouer</AppButton>
            </template>
          </div>
        </div>
      </div>

      <div class="relative min-h-0 flex-1">
        <div class="absolute inset-0">
          <BoardPreview
            :key="lesson.key"
            :width="world.rows[0]!.length"
            :height="world.rows.length"
            :tiles="tiles"
            :players="players"
            :marker="target"
          />
        </div>
        <p
          v-if="world.rival"
          class="absolute inset-x-0 bottom-0 text-center text-sm font-bold tabular-nums"
        >
          <span :style="{ color: players[0]!.color }">Toi {{ world.me.score }}</span>
          <span class="text-ink/40"> — </span>
          <span :style="{ color: players[1]!.color }">{{ world.rival.score }} Cyan</span>
        </p>
      </div>
    </div>

    <!-- Les boutons restent visibles même à la souris : c'est eux qui montrent
         le sens à prendre. Le clavier marche aussi. -->
    <div
      v-if="phase === 'play'"
      class="mx-auto grid w-full max-w-md shrink-0 grid-cols-2 gap-2 short:contents"
    >
      <DirectionPad :hint="hint" :haptics-enabled="settings.hapticsEnabled" @move="move" />
    </div>
  </div>
</template>

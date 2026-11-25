<script setup lang="ts">
import { computed } from "vue";
import { DUCK_GLOW, DUCK_IMAGES } from "../../lib/ducks.js";
import type { RankedPlayer } from "../../lib/rankingApi.js";

const props = defineProps<{ players: RankedPlayer[]; me?: string }>();

// Écrites en toutes lettres : Tailwind ne génère que les classes qu'il lit dans le
// code. Les hauteurs suivent celle de l'écran, pour que tout tienne sans défiler.
const STYLES: Record<number, { step: string; duck: string; size: string }> = {
  1: {
    step: "h-[clamp(2.25rem,9dvh,5rem)] !bg-ink/10 text-cyan-400",
    duck: DUCK_IMAGES.jaune,
    size: "h-[clamp(3rem,10dvh,6rem)]",
  },
  2: {
    step: "h-[clamp(1.75rem,6dvh,3.5rem)]",
    duck: DUCK_IMAGES.cyan,
    size: "h-[clamp(2.5rem,8dvh,4.5rem)]",
  },
  3: {
    step: "h-[clamp(1.5rem,4.5dvh,2.75rem)]",
    duck: DUCK_IMAGES.rouge,
    size: "h-[clamp(2.5rem,8dvh,4.5rem)]",
  },
};

// Le premier au milieu, encadré du deuxième et du troisième.
const ordered = computed(() =>
  [2, 1, 3].flatMap((place) => {
    const player = props.players[place - 1];
    return player ? [{ player, place, style: STYLES[place]! }] : [];
  }),
);
</script>

<template>
  <ol class="grid shrink-0 grid-cols-3 items-end gap-2">
    <li
      v-for="{ player, place, style } in ordered"
      :key="player.username"
      :data-place="place"
      class="flex min-w-0 flex-col items-center"
      :class="place === 1 ? 'order-2' : place === 2 ? 'order-1' : 'order-3'"
    >
      <i v-if="place === 1" class="accent-icon ri-vip-crown-fill text-xl" aria-hidden="true" />
      <img
        :src="style.duck"
        alt=""
        class="duck-glow w-auto object-contain"
        :class="style.size"
        :style="{ '--duck-glow': DUCK_GLOW[style.duck] }"
      />
      <span
        class="w-full truncate text-center text-xs font-semibold"
        :class="player.username === me ? 'text-cyan-400' : ''"
      >
        {{ player.username }}<template v-if="player.username === me"> (toi)</template>
      </span>
      <span class="text-xs tabular-nums text-ink/60">{{ player.rating }}</span>
      <div
        class="panel mt-1 flex w-full items-center justify-center rounded-t-xl !border-b-0 text-xl font-bold"
        :class="style.step"
      >
        {{ player.rank }}
      </div>
    </li>
  </ol>
</template>

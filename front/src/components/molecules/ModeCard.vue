<script setup lang="ts">
import { DUCK_GLOW } from "../../lib/ducks.js";

withDefaults(
  defineProps<{
    label: string;
    description: string;
    ready: boolean;
    // Destination de la carte : chaque mode a la sienne (le mode voyage dans
    // l'URL, puis dans le JOIN — voir pages/Game.vue).
    to: string;
    /** Réservé aux comptes : la carte mène à l'inscription. */
    locked?: boolean;
    ducks?: string[];
    details?: { icon: string; text: string }[];
  }>(),
  { ducks: () => [], details: () => [], locked: false },
);

defineEmits<{ maps: []; rules: [] }>();
</script>

<template>
  <article
    :class="locked ? 'opacity-50 grayscale' : ''"
    class="panel group relative flex min-h-0 flex-col justify-between gap-2 rounded-2xl p-3 tiny:gap-1.5 tiny:p-2.5 short:gap-1 short:p-2 transition hover:-translate-y-0.5 active:scale-[0.98] sm:p-4"
  >
    <div class="flex items-start justify-between gap-3 short:flex-col-reverse short:gap-0">
      <div class="min-w-0">
        <h2 class="text-lg font-extrabold sm:text-xl">{{ label }}</h2>
        <p class="text-xs text-ink/70 sm:text-sm short:hidden">{{ description }}</p>
      </div>
      <div class="flex shrink-0 -space-x-2">
        <img
          v-for="duck in ducks"
          :key="duck"
          :src="duck"
          :style="{ '--duck-glow': DUCK_GLOW[duck] }"
          alt=""
          class="duck-glow h-11 w-11 object-contain sm:h-14 sm:w-14 short:h-9 short:w-9"
        />
      </div>
    </div>

    <ul class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink/70 short:flex-col short:gap-y-0">
      <li v-for="detail in details" :key="detail.text" class="flex items-center gap-1">
        <i class="accent-icon" :class="detail.icon" aria-hidden="true" />
        {{ detail.text }}
      </li>
    </ul>

    <div
      class="flex items-center justify-between gap-2 short:flex-col short:items-stretch short:gap-1"
    >
      <!-- Au-dessus du lien étiré, pour rester cliquables. -->
      <div class="relative z-10 flex gap-2">
        <button
          type="button"
          class="rounded-lg border border-ink/15 bg-ink/10 px-3 py-1.5 text-xs font-semibold text-ink/80"
          @click="$emit('maps')"
        >
          <i class="ri-map-2-line" aria-hidden="true" /> Cartes
        </button>
        <button
          type="button"
          class="rounded-lg border border-ink/15 bg-ink/10 px-3 py-1.5 text-xs font-semibold text-ink/80"
          @click="$emit('rules')"
        >
          <i class="ri-book-open-line" aria-hidden="true" /> Règles
        </button>
      </div>
      <!-- Le lien couvre toute la carte : on joue en la touchant n'importe où. -->
      <RouterLink
        v-if="ready"
        :to="to"
        :aria-label="locked ? `S'inscrire pour jouer en ${label}` : `Jouer en ${label}`"
        class="flex items-center justify-end gap-1 text-sm font-bold after:absolute after:inset-0 after:rounded-2xl"
      >
        <span>{{ locked ? "S'inscrire" : "Jouer" }}</span>
        <i
          v-if="!locked"
          class="accent-icon ri-arrow-right-circle-fill text-2xl transition group-hover:translate-x-1"
          aria-hidden="true"
        />
      </RouterLink>
      <span v-else class="rounded-lg bg-ink/10 px-3 py-1.5 text-xs text-ink/40">Bientôt</span>
    </div>
  </article>
</template>

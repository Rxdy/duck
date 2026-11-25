<script setup lang="ts">
import { computed } from "vue";
import {
  isPasswordAccepted,
  passwordEntropy,
  REQUIRED_BITS,
  REQUIRED_RATIO,
  strengthRatio,
} from "../../lib/passwordStrength.js";

/**
 * Jauge sous le champ mot de passe de l'inscription : elle avance à chaque
 * caractère. Un repère marque le minimum exigé, seule règle ; au-delà, elle
 * continue de monter pour montrer qu'on peut faire mieux.
 */
const props = defineProps<{ password: string }>();

const bits = computed(() => passwordEntropy(props.password));
const ratio = computed(() => strengthRatio(props.password));
const enough = computed(() => isPasswordAccepted(props.password));
const label = computed(() => {
  if (!enough.value) return ratio.value < REQUIRED_RATIO / 2 ? "Trop faible" : "Encore un effort";
  if (bits.value >= 100) return "Excellent";
  return bits.value >= 80 ? "Solide" : "C'est bon !";
});
const color = computed(() => {
  if (!enough.value) return ratio.value < REQUIRED_RATIO / 2 ? "bg-red-500" : "bg-amber-500";
  return "bg-emerald-500";
});
</script>

<template>
  <div v-if="password" class="flex flex-col gap-1.5">
    <div
      class="relative h-2 rounded-full bg-ink/10"
      role="progressbar"
      :aria-valuenow="ratio"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-valuetext="`${label}, ${bits} bits, minimum ${REQUIRED_BITS}`"
      aria-label="Sécurité du mot de passe"
    >
      <div
        data-fill
        class="h-full rounded-full transition-all duration-300"
        :class="color"
        :style="{ width: `${ratio}%` }"
      />
      <!-- Le minimum : à franchir, pas à atteindre pile. -->
      <span
        data-minimum
        aria-hidden="true"
        class="absolute -top-1 h-4 w-0.5 rounded bg-ink/70"
        :style="{ left: `${REQUIRED_RATIO}%` }"
      />
    </div>

    <div class="flex items-baseline justify-between gap-2 text-xs">
      <!-- Dit en toutes lettres : la couleur seule ne parvient pas à tout le monde. -->
      <span
        class="font-semibold"
        :class="enough ? 'text-emerald-400' : 'text-ink/80'"
        aria-live="polite"
      >
        <i v-if="enough" class="ri-check-line" aria-hidden="true" />
        {{ label }}
      </span>
      <span class="tabular-nums text-ink/50">{{ bits }} bits · minimum {{ REQUIRED_BITS }}</span>
    </div>

    <p v-if="!enough" class="text-xs text-ink/50">
      Rallonge-le, ou mêle majuscules, chiffres et symboles.
    </p>
  </div>
</template>

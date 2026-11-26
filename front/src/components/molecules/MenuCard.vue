<script setup lang="ts">
withDefaults(
  defineProps<{
    to: string;
    label: string;
    description?: string;
    // L'action principale de l'écran, seule à porter l'accent.
    primary?: boolean;
    /** Réservé aux comptes : grisé pour un invité. */
    locked?: boolean;
  }>(),
  { primary: false, locked: false, description: undefined },
);
</script>

<template>
  <RouterLink
    :to="to"
    class="block rounded-2xl px-5 py-3.5 text-left transition active:scale-[0.98] tiny:py-2 short:py-1.5"
    :class="[
      primary ? 'bg-cyan-500 text-slate-950' : 'panel hover:border-cyan-500/60',
      locked ? 'opacity-50 grayscale' : '',
    ]"
  >
    <div :class="primary ? 'text-xl font-bold' : 'text-base font-semibold'">{{ label }}</div>
    <div v-if="description" class="text-sm" :class="primary ? 'text-slate-950/75' : 'text-ink/60'">
      {{ description }}
    </div>
  </RouterLink>
</template>

<script setup lang="ts">
defineProps<{
  label: string;
  description: string;
  ready: boolean;
}>();
</script>

<template>
  <div class="rounded-xl border border-white/10 bg-white/5 p-4">
    <div class="flex items-center justify-between gap-4">
      <div>
        <div class="font-semibold">{{ label }}</div>
        <div class="text-sm text-white/60">{{ description }}</div>
      </div>
      <RouterLink
        v-if="ready"
        to="/jeu"
        class="shrink-0 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950"
      >
        Jouer
      </RouterLink>
      <span v-else class="shrink-0 rounded-lg bg-white/10 px-4 py-2 text-sm text-white/40">
        Bientôt
      </span>
    </div>
  </div>
</template>

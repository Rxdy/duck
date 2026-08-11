<script setup lang="ts">
defineProps<{
  label: string;
  description: string;
  ready: boolean;
  // Destination du bouton "Jouer" : chaque mode a la sienne (le mode voyage
  // dans l'URL, puis dans le JOIN — voir pages/Game.vue).
  to: string;
}>();
</script>

<template>
  <div class="rounded-xl border border-ink/10 bg-surface p-4">
    <div class="flex items-center justify-between gap-4">
      <div>
        <div class="font-semibold">{{ label }}</div>
        <div class="text-sm text-ink/60">{{ description }}</div>
      </div>
      <RouterLink
        v-if="ready"
        :to="to"
        class="shrink-0 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950"
      >
        Jouer
      </RouterLink>
      <span v-else class="shrink-0 rounded-lg bg-ink/10 px-4 py-2 text-sm text-ink/40">
        Bientôt
      </span>
    </div>
  </div>
</template>

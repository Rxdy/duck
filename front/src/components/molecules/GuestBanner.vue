<script setup lang="ts">
/** Rappel discret en bas d'écran pour un joueur sans compte. */
</script>

<template>
  <RouterLink
    to="/inscription"
    class="flex shrink-0 items-center justify-center gap-3 border-t border-ink/10 bg-surface px-3 pt-1.5 text-xs short:pt-0 short:text-[11px]"
    style="padding-bottom: max(0.125rem, env(safe-area-inset-bottom))"
  >
    <span class="min-w-0 truncate text-ink/80"> Garde ta progression </span>
    <span class="shrink-0 rounded-lg bg-cyan-500 px-3 py-1 font-bold short:py-0 text-slate-950">
      S'inscrire
    </span>
  </RouterLink>
</template>

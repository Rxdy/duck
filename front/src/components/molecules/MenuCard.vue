<script setup lang="ts">
defineProps<{
  to: string;
  label: string;
  description: string;
  accent: string;
}>();
</script>

<template>
  <RouterLink
    :to="to"
    class="menu-card group relative block overflow-hidden rounded-xl border-l-4 border-white/10 bg-white/5 px-5 py-4 text-left backdrop-blur-sm transition active:scale-[0.98]"
    :style="{ borderLeftColor: accent, '--accent': accent }"
  >
    <span class="fill pointer-events-none absolute inset-0" aria-hidden="true" />
    <div
      class="relative text-lg font-semibold transition-colors duration-300 group-hover:text-slate-950"
    >
      {{ label }}
    </div>
    <div
      class="relative text-sm text-white/60 transition-colors duration-300 group-hover:text-slate-950/70"
    >
      {{ description }}
    </div>
  </RouterLink>
</template>

<style scoped>
.fill {
  background-color: var(--accent);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.35s ease;
}

.menu-card:hover .fill,
.menu-card:focus-visible .fill {
  transform: scaleX(1);
}

@media (prefers-reduced-motion: reduce) {
  .fill {
    transition: none;
  }
}
</style>

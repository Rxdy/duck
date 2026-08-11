<script setup lang="ts">
import DuckAvatar from "../atoms/DuckAvatar.vue";

defineProps<{ username?: string | null }>();
</script>

<template>
  <header
    class="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3"
    style="padding-top: max(0.75rem, env(safe-area-inset-top))"
  >
    <RouterLink to="/" class="flex items-center gap-2">
      <DuckAvatar variant="logo" />
      <span class="text-lg font-bold tracking-wide">Duck</span>
    </RouterLink>

    <div class="flex items-center gap-2">
      <RouterLink
        v-if="username"
        to="/compte"
        aria-label="Mon compte"
        class="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-slate-900 text-sm font-semibold uppercase active:bg-slate-800"
      >
        {{ username.charAt(0) }}
      </RouterLink>

      <RouterLink
        to="/canard"
        aria-label="Mon canard"
        class="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-slate-900 active:bg-slate-800"
      >
        <DuckAvatar variant="avatar" />
      </RouterLink>
    </div>
  </header>
</template>

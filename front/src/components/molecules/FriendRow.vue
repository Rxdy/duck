<script setup lang="ts">
/** Une ligne de joueur : pseudo, classement, et les actions possibles à droite. */
defineProps<{ username: string; tag: string; rating: number; note?: string }>();
</script>

<template>
  <li class="panel flex items-center gap-2 rounded-xl px-3 py-1.5">
    <span class="min-w-0 flex-1">
      <span class="block truncate text-sm font-bold"
        >{{ username
        }}<span class="font-mono text-xs font-normal text-ink/50">#{{ tag }}</span></span
      >
      <span class="block truncate text-xs text-ink/60">{{ note ?? `${rating} points` }}</span>
    </span>
    <slot />
  </li>
</template>

<script setup lang="ts">
/**
 * Le canard du jeu, dans sa version TRANSPARENTE (voir
 * scripts/generate-icons.py) : les icônes système gardent un fond opaque
 * parce qu'elles sont posées sur un fond qu'on ne maîtrise pas, mais dans
 * l'interface ce fond ferait une vignette sombre collée sur la page.
 */
withDefaults(defineProps<{ variant?: "logo" | "avatar" }>(), { variant: "avatar" });
</script>

<template>
  <img
    src="/duck-mark.png"
    alt=""
    :class="variant === 'logo' ? 'h-8 w-8 object-contain' : 'h-7 w-7 object-contain'"
  />
</template>

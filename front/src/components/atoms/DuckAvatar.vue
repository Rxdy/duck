<script setup lang="ts">
withDefaults(defineProps<{ variant?: "logo" | "avatar" }>(), { variant: "avatar" });
</script>

<template>
  <img
    src="/duck.png"
    alt=""
    :class="
      variant === 'logo' ? 'h-8 w-8 rounded object-cover' : 'h-7 w-7 rounded-full object-cover'
    "
  />
</template>

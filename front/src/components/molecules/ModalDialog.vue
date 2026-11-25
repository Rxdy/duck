<script setup lang="ts">
import IconButton from "../atoms/IconButton.vue";

defineProps<{ title: string }>();
const emit = defineEmits<{ close: [] }>();
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-surface-deep/85 p-3"
    @click.self="emit('close')"
    @keydown.esc="emit('close')"
  >
    <div
      role="dialog"
      aria-modal="true"
      :aria-label="title"
      class="panel flex max-h-full w-full max-w-lg flex-col gap-3 overflow-y-auto rounded-2xl !bg-surface p-4"
    >
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-lg font-bold">{{ title }}</h2>
        <IconButton icon="ri-close-line" label="Fermer" @click="emit('close')" />
      </div>
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { SPAWN_KINDS, spawnColor, type Tool } from "../../lib/mapEditor.js";

defineProps<{ modelValue: Tool }>();
defineEmits<{ "update:modelValue": [tool: Tool] }>();
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <button
      v-for="kind in SPAWN_KINDS"
      :key="kind"
      type="button"
      class="h-9 w-9 rounded-full border-2 transition"
      :class="modelValue === kind ? 'scale-110 border-white' : 'border-white/20'"
      :style="{ backgroundColor: spawnColor(kind) }"
      :aria-label="`Spawn ${kind}`"
      @click="$emit('update:modelValue', kind)"
    />

    <button
      type="button"
      class="rounded-lg px-4 py-2 text-sm font-semibold transition"
      :class="modelValue === 'wall' ? 'bg-cyan-500 text-slate-950' : 'bg-white/10 text-white/70'"
      @click="$emit('update:modelValue', 'wall')"
    >
      Mur
    </button>
  </div>
</template>

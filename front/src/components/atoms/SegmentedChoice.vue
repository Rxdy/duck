<script setup lang="ts" generic="T extends string">
defineProps<{
  label: string;
  options: readonly { value: T; label: string; icon?: string }[];
  modelValue: T;
}>();
defineEmits<{ "update:modelValue": [value: T] }>();
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-3 text-sm">
    <span class="text-ink/70">{{ label }}</span>
    <div class="flex overflow-hidden rounded-lg border border-ink/15">
      <button
        v-for="option in options"
        :key="option.value"
        type="button"
        class="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition"
        :class="modelValue === option.value ? 'bg-cyan-500 text-slate-950' : 'text-ink/60'"
        :aria-pressed="modelValue === option.value"
        @click="$emit('update:modelValue', option.value)"
      >
        <i v-if="option.icon" :class="option.icon" aria-hidden="true" />
        {{ option.label }}
      </button>
    </div>
  </div>
</template>

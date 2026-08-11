<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    to?: string;
    variant?: "primary" | "ghost";
    disabled?: boolean;
  }>(),
  { variant: "ghost", disabled: false },
);

const emit = defineEmits<{ click: [] }>();

const classes = computed(() => {
  const base = "rounded-lg px-4 py-2 text-sm font-semibold transition active:scale-95";
  if (props.disabled) return `${base} bg-white/10 text-white/40`;
  return props.variant === "primary"
    ? `${base} bg-cyan-500 text-slate-950`
    : `${base} bg-white/10 text-white/70`;
});

function onClick() {
  if (!props.disabled) emit("click");
}
</script>

<template>
  <RouterLink v-if="to && !disabled" :to="to" :class="classes">
    <slot />
  </RouterLink>
  <button v-else type="button" :class="classes" :disabled="disabled" @click="onClick">
    <slot />
  </button>
</template>

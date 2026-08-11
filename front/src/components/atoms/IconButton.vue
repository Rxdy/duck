<script setup lang="ts">
/**
 * Bouton réduit à une icône (Remix Icon). Le libellé n'est pas décoratif : il
 * sert d'infobulle ET de nom accessible — une icône seule ne dit rien à un
 * lecteur d'écran, ni à qui hésite sur sa signification.
 */
withDefaults(
  defineProps<{
    // Classe Remix Icon, par exemple "ri-eye-line" (voir remixicon.com).
    icon: string;
    label: string;
    disabled?: boolean;
  }>(),
  { disabled: false },
);

const emit = defineEmits<{ click: [] }>();
</script>

<template>
  <button
    type="button"
    :title="label"
    :aria-label="label"
    :disabled="disabled"
    class="flex h-9 w-9 items-center justify-center rounded-lg border border-ink/10 text-lg transition active:scale-95"
    :class="disabled ? 'bg-surface/60 text-ink/25' : 'bg-surface/80 text-ink/80'"
    @click="!disabled && emit('click')"
  >
    <i :class="icon" aria-hidden="true" />
  </button>
</template>

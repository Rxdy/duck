<script setup lang="ts">
import { SPAWN_KINDS, spawnColor, type Tool } from "../../lib/mapEditor.js";

/**
 * Outils de l'éditeur, groupés façon ruban : chaque groupe porte son libellé
 * centré EN DESSOUS de ses éléments. Sans ces libellés, quatre ronds de
 * couleur posés à côté d'un bouton "Mur" n'expliquent rien à qui ouvre
 * l'éditeur pour la première fois.
 */
defineProps<{ modelValue: Tool }>();
defineEmits<{ "update:modelValue": [tool: Tool] }>();
</script>

<template>
  <div class="flex flex-wrap items-end gap-4">
    <div class="flex flex-col items-center gap-1">
      <div class="flex items-center gap-2">
        <button
          v-for="(kind, index) in SPAWN_KINDS"
          :key="kind"
          type="button"
          class="h-9 w-9 rounded-full border-2 transition"
          :class="modelValue === kind ? 'scale-110 border-ink' : 'border-ink/20'"
          :style="{ backgroundColor: spawnColor(kind) }"
          :aria-label="`Spawn du joueur ${index + 1}`"
          @click="$emit('update:modelValue', kind)"
        />
      </div>
      <span class="text-[10px] uppercase tracking-wider text-ink/40">Spawn</span>
    </div>

    <div class="flex flex-col items-center gap-1">
      <button
        type="button"
        class="rounded-lg px-4 py-2 text-sm font-semibold transition"
        :class="modelValue === 'wall' ? 'bg-cyan-500 text-slate-950' : 'bg-ink/10 text-ink/70'"
        @click="$emit('update:modelValue', 'wall')"
      >
        Mur
      </button>
      <span class="text-[10px] uppercase tracking-wider text-ink/40">Obstacle</span>
    </div>
  </div>
</template>

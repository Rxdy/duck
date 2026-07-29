<script setup lang="ts">
import type { SavedMap } from "../../lib/savedMaps.js";

defineProps<{ maps: SavedMap[]; activeId?: string }>();
defineEmits<{ load: [id: string]; delete: [id: string] }>();
</script>

<template>
  <ul v-if="maps.length > 0" class="flex flex-col gap-1">
    <li
      v-for="m in maps"
      :key="m.id"
      class="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm"
      :class="m.id === activeId ? 'bg-cyan-500/20' : 'bg-white/5'"
    >
      <button type="button" class="flex-1 text-left" @click="$emit('load', m.id)">
        <span class="font-semibold">{{ m.name }}</span>
        <span class="text-white/40"> · {{ m.width }}×{{ m.height }}</span>
      </button>
      <button
        type="button"
        aria-label="Supprimer"
        class="px-1 text-white/40"
        @click="$emit('delete', m.id)"
      >
        ✕
      </button>
    </li>
  </ul>
  <p v-else class="text-xs text-white/40">Aucune carte enregistrée pour l'instant.</p>
</template>

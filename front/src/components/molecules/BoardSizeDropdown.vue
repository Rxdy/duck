<script setup lang="ts">
import { BOARD_PRESETS } from "../../lib/board.js";

defineProps<{ modelValue: string }>();
defineEmits<{ "update:modelValue": [id: string] }>();

const duelPresets = BOARD_PRESETS.filter((p) => p.category === "duel");
const equipePresets = BOARD_PRESETS.filter((p) => p.category === "equipe");
</script>

<template>
  <select
    class="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-white"
    :value="modelValue"
    @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
  >
    <optgroup label="Duel (1v1)">
      <option v-for="p in duelPresets" :key="p.id" :value="p.id">
        {{ p.label }} · {{ p.width }}×{{ p.height }}
      </option>
    </optgroup>
    <optgroup label="Équipe / FFA">
      <option v-for="p in equipePresets" :key="p.id" :value="p.id">
        {{ p.label }} · {{ p.width }}×{{ p.height }}
      </option>
    </optgroup>
  </select>
</template>

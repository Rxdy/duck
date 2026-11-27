<script setup lang="ts">
// Un coffre dessiné, teinté selon sa rareté. Seul l'or a un léger éclat au repos : l'interface reste
// sobre. Le couvercle bascule (en douceur) quand `open` passe à vrai.
import { computed } from "vue";
import { CHEST_LOOK } from "../../lib/chests.js";
import type { ChestRarity } from "../../types.js";

const props = withDefaults(defineProps<{ rarity: ChestRarity; open?: boolean }>(), {
  open: false,
});
const color = computed(() => CHEST_LOOK[props.rarity].color);
</script>

<template>
  <svg
    viewBox="0 -8 48 48"
    aria-hidden="true"
    class="h-full w-full overflow-visible"
    :style="rarity === 'or' ? { filter: `drop-shadow(0 0 6px ${color}88)` } : undefined"
  >
    <!-- Caisse -->
    <rect x="5" y="17" width="38" height="20" rx="3" :fill="color" />
    <rect x="5" y="17" width="38" height="20" rx="3" fill="#000" opacity="0.18" />
    <rect x="13" y="17" width="3" height="20" fill="#0b1220" opacity="0.22" />
    <rect x="32" y="17" width="3" height="20" fill="#0b1220" opacity="0.22" />
    <!-- Couvercle : il pivote sur sa charnière arrière. -->
    <g class="chest-lid" :class="{ 'chest-lid-open': open }">
      <path d="M5 17 V12 a9 7 0 0 1 9 -7 h20 a9 7 0 0 1 9 7 V17 Z" :fill="color" />
      <rect x="5" y="15" width="38" height="3" fill="#0b1220" opacity="0.35" />
      <rect x="13" y="5" width="3" height="12" fill="#0b1220" opacity="0.22" />
      <rect x="32" y="5" width="3" height="12" fill="#0b1220" opacity="0.22" />
      <rect x="20.5" y="13" width="7" height="7" rx="1.5" fill="#0b1220" opacity="0.55" />
      <circle cx="24" cy="16.5" r="1.4" :fill="color" />
    </g>
  </svg>
</template>

<style scoped>
.chest-lid {
  transform-box: fill-box;
  transform-origin: 0% 100%;
  transition: transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.chest-lid-open {
  transform: translateY(-1px) rotate(-30deg);
}
@media (prefers-reduced-motion: reduce) {
  .chest-lid {
    transition: none;
  }
}
</style>

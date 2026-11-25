<script setup lang="ts">
import { computed } from "vue";
import type { Direction } from "../../types.js";
import type { ScreenPoint } from "../../lib/touchZones.js";
import { isTouchScreen } from "../../lib/pointer.js";
import { useSettingsStore } from "../../store/settingsStore.js";
import DirectionPad from "./DirectionPad.vue";
import TapZoneControls from "./TapZoneControls.vue";

defineProps<{ anchor?: ScreenPoint }>();
defineEmits<{ move: [direction: Direction] }>();

const settings = useSettingsStore();
const touch = isTouchScreen();
const usePad = computed(() => touch && settings.touchControls === "boutons");
</script>

<template>
  <!-- Les boutons ont leur propre place, hors du plateau : le doigt ne le cache
       jamais. Debout ils sont dessous, couché de part et d'autre. -->
  <div
    class="flex h-full w-full flex-col"
    :class="
      usePad
        ? 'short:grid short:grid-cols-[6rem_minmax(0,1fr)_6rem] short:grid-rows-2 short:gap-2 short:p-2'
        : ''
    "
  >
    <div
      class="relative min-h-0 flex-1"
      :class="usePad ? 'short:col-start-2 short:row-span-2 short:row-start-1' : ''"
    >
      <slot />
      <TapZoneControls
        v-if="!usePad"
        :haptics-enabled="settings.hapticsEnabled"
        :anchor="anchor"
        :reduced-motion="settings.reducedMotion"
        @move="$emit('move', $event)"
      />
      <slot name="overlay" />
    </div>

    <div v-if="usePad" class="grid shrink-0 grid-cols-2 gap-2 p-2 short:contents">
      <DirectionPad :haptics-enabled="settings.hapticsEnabled" @move="$emit('move', $event)" />
    </div>
  </div>
</template>

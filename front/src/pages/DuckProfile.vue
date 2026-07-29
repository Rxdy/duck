<script setup lang="ts">
import { PLAYER_COLORS } from "../theme.js";
</script>

<template>
  <div class="flex h-full flex-col items-center justify-center gap-6 px-4 text-center">
    <h1 class="text-2xl font-bold">Mon canard</h1>
    <p class="text-white/60">La gestion des skins arrive bientôt.</p>

    <div class="flex gap-3">
      <span
        v-for="color in PLAYER_COLORS"
        :key="color"
        class="h-10 w-10 rounded-full border border-white/20"
        :style="{ backgroundColor: color }"
      />
    </div>
  </div>
</template>

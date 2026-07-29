<script setup lang="ts">
import { useGameStore } from "../store/gameStore.js";
import { useGameSocket } from "../composables/useGameSocket.js";
import BoardPreview from "../components/organisms/BoardPreview.vue";
import TapZoneControls from "../components/organisms/TapZoneControls.vue";

const store = useGameStore();
const { move } = useGameSocket("lobby", "Player");

// Le protocole ne transmet pas encore les dimensions de la carte au client (voir
// back/src/room.ts, généré en 12x12) : à mettre à jour quand le serveur enverra la taille réelle.
const BOARD_SIZE = 12;
</script>

<template>
  <div class="relative h-full w-full">
    <BoardPreview :width="BOARD_SIZE" :height="BOARD_SIZE" :players="store.players" />
    <TapZoneControls @move="move" />
  </div>
</template>

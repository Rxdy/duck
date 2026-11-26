<script setup lang="ts">
/** La marque à côté du titre : la tête du coincoin, la même qu'en icône d'onglet. */
// Liée et non écrite en dur : sinon Vite l'incorpore, et ce ne serait plus le fichier de l'onglet.
const ICON = "/favicon.svg";
</script>

<template>
  <img :src="ICON" alt="" class="h-8 w-8 object-contain" />
</template>

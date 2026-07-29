<script setup lang="ts">
import AppHeader from "../components/organisms/AppHeader.vue";
</script>

<template>
  <div class="flex h-dvh w-dvw flex-col bg-slate-950 text-white">
    <AppHeader />

    <main class="min-h-0 flex-1">
      <RouterView />
    </main>
  </div>
</template>

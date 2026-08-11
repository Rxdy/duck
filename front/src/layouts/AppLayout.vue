<script setup lang="ts">
import AppHeader from "../components/organisms/AppHeader.vue";
import { useAuthStore } from "../store/authStore.js";

const auth = useAuthStore();
</script>

<template>
  <div class="flex h-dvh w-dvw flex-col bg-surface-deep text-ink">
    <AppHeader :username="auth.session?.username" @logout="auth.logout()" />

    <main class="min-h-0 flex-1">
      <RouterView />
    </main>
  </div>
</template>

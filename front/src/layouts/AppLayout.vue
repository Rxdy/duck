<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import PageBackdrop from "../components/atoms/PageBackdrop.vue";
import MatchmakingBar from "../components/organisms/MatchmakingBar.vue";
import AppHeader from "../components/organisms/AppHeader.vue";
import { useAuthStore } from "../store/authStore.js";

const auth = useAuthStore();
const route = useRoute();
// Les écrans qui occupent toute la largeur avec un plateau se passent de décor.
const decorated = computed(
  () =>
    !["home", "game", "test-game", "creative", "training", "training-free"].includes(
      String(route.name),
    ),
);
</script>

<template>
  <div class="flex h-dvh w-dvw flex-col bg-surface-deep text-ink">
    <AppHeader :username="auth.session?.username" @logout="auth.logout()" />

    <MatchmakingBar />

    <main class="relative min-h-0 flex-1">
      <PageBackdrop v-if="decorated" />
      <div class="relative h-full">
        <RouterView />
      </div>
    </main>
  </div>
</template>

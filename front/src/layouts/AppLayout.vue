<script setup lang="ts">
import { computed, watch } from "vue";
import { useRoute } from "vue-router";
import PageBackdrop from "../components/atoms/PageBackdrop.vue";
import MatchmakingBar from "../components/organisms/MatchmakingBar.vue";
import AppHeader from "../components/organisms/AppHeader.vue";
import GuestBanner from "../components/molecules/GuestBanner.vue";
import InviteBar from "../components/organisms/InviteBar.vue";
import { useAuthStore } from "../store/authStore.js";
import { useTutorialGift } from "../composables/useTutorialGift.js";
import { useWardrobeStore } from "../store/wardrobeStore.js";
import { useFriendsStore } from "../store/friendsStore.js";

const auth = useAuthStore();
const route = useRoute();
const friends = useFriendsStore();
void auth.completeSession();
const gift = useTutorialGift();
const wardrobe = useWardrobeStore();
// Le canard de l'en-tête suit le compte connecté, et le cadeau qu'il vient de recevoir.
watch([() => auth.session?.token, gift], () => wardrobe.refresh(auth.session?.token), {
  immediate: true,
});
// La pastille des demandes se met à jour à chaque changement de page.
watch([() => route.path, () => auth.session?.token], () => friends.refresh(auth.session?.token), {
  immediate: true,
});
// Les écrans qui occupent toute la largeur avec un plateau se passent de décor.
const decorated = computed(
  () =>
    !["game", "test-game", "creative", "training", "training-free"].includes(String(route.name)),
);
// Pas de bandeau pendant qu'on joue, ni sur les pages qui servent déjà à s'identifier.
const invites = computed(
  () =>
    !["game", "test-game", "training", "training-free", "sign-up", "login"].includes(
      String(route.name),
    ),
);
</script>

<template>
  <div class="flex h-dvh w-dvw flex-col bg-surface-deep text-ink">
    <AppHeader
      :username="auth.session?.username"
      :friend-requests="friends.incoming.length"
      :outfit="wardrobe.outfit"
      @logout="auth.logout()"
    />

    <MatchmakingBar />
    <InviteBar />

    <main class="relative min-h-0 flex-1">
      <!-- Un seul fond pour tous les menus : il ne change pas d'une page à l'autre. -->
      <PageBackdrop v-if="decorated" />
      <div class="relative h-full">
        <RouterView />
      </div>
    </main>

    <GuestBanner v-if="!auth.isLoggedIn && invites" />
  </div>
</template>

<script setup lang="ts">
import MenuCard from "../components/molecules/MenuCard.vue";
import DuckPortrait from "../components/atoms/DuckPortrait.vue";
import { useWardrobeStore } from "../store/wardrobeStore.js";
import { DUCK_GLOW, DUCK_IMAGES } from "../lib/ducks.js";
import { useAuthStore } from "../store/authStore.js";

const auth = useAuthStore();
const wardrobe = useWardrobeStore();

// « Jouer » domine, les trois destinations courantes suivent. Le reste est dans le
// menu du profil, en haut à droite.
const menu = [
  { to: "/jouer", label: "Jouer", desc: "Duel ou FFA 4 joueurs" },
  { to: "/entrainement", label: "Camp d'entraînement" },
  { to: "/creatif", label: "Créatif", account: true },
  { to: "/classement", label: "Classement" },
];
</script>

<template>
  <!-- « safe » : centré quand tout tient, aligné en haut et défilable sinon.
       Un simple centrage coupait le titre sur les petits écrans. Couché, le
       canard passe à gauche du menu. -->
  <div
    class="flex h-full flex-col items-center gap-4 overflow-y-auto px-4 py-4 text-center text-ink [justify-content:safe_center] tiny:gap-2 tiny:py-2 short:flex-row short:justify-center short:gap-8 short:py-2"
  >
    <div class="flex shrink-0 flex-col items-center gap-1 short:w-40">
      <DuckPortrait
        :outfit="wardrobe.outfit"
        class="duck-glow h-28 w-28 tiny:h-16 tiny:w-16 sm:h-32 sm:w-32 short:h-24 short:w-24"
        :style="{ '--duck-glow': DUCK_GLOW[DUCK_IMAGES.rouge] }"
      />
      <h1 class="text-3xl font-bold tiny:text-2xl">Duck</h1>
      <p class="text-sm text-ink/70">Rejoins la base adverse pour marquer.</p>
    </div>

    <div
      class="flex w-full max-w-sm shrink-0 flex-col gap-3 short:min-w-0 short:shrink tiny:gap-2 short:gap-1.5"
    >
      <nav class="grid grid-cols-2 gap-3 tiny:gap-2 short:gap-1.5">
        <MenuCard
          v-for="(item, index) in menu"
          :key="item.to"
          :to="item.to"
          :label="item.label"
          :description="item.account && !auth.isLoggedIn ? 'Avec un compte' : item.desc"
          :primary="index === 0"
          :locked="item.account && !auth.isLoggedIn"
          class="col-span-2"
        />
      </nav>
    </div>
  </div>
</template>

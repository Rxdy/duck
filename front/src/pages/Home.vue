<script setup lang="ts">
import { PLAYER_COLORS } from "../theme.js";
import MenuCard from "../components/molecules/MenuCard.vue";
import { useAuthStore } from "../store/authStore.js";

const auth = useAuthStore();

const menu = [
  { to: "/jouer", label: "Jouer", desc: "Rejoins une partie ou choisis un mode" },
  { to: "/creatif", label: "Créatif", desc: "Crée et teste tes propres cartes" },
  { to: "/credits", label: "Crédits", desc: "Qui a fait ce jeu" },
  { to: "/options", label: "Options", desc: "Réglages du jeu" },
];

function hideOnError(event: Event) {
  (event.target as HTMLImageElement).style.display = "none";
}
</script>

<template>
  <div class="relative h-full w-full overflow-hidden">
    <img
      src="/duck.png"
      alt=""
      aria-hidden="true"
      class="animated-bg absolute inset-0 h-full w-full object-cover blur-md brightness-[0.35]"
    />
    <div
      class="absolute inset-0 bg-gradient-to-b from-slate-950/30 via-slate-950/70 to-slate-950"
    />

    <div
      class="relative z-10 flex h-full flex-col items-center justify-center gap-8 px-4 py-8 text-center"
    >
      <div>
        <div class="flex items-center justify-center gap-3">
          <img
            src="/mascot.png"
            alt=""
            class="h-16 w-16 object-contain drop-shadow-lg"
            @error="hideOnError"
          />
          <h1 class="text-3xl font-extrabold sm:text-4xl">Bienvenue sur Duck</h1>
        </div>
        <p class="mt-2 text-white/70">Rejoins la base adverse pour marquer des points.</p>
      </div>

      <nav class="grid w-full max-w-sm gap-3">
        <MenuCard
          v-for="(item, index) in menu"
          :key="item.to"
          :to="item.to"
          :label="item.label"
          :description="item.desc"
          :accent="PLAYER_COLORS[index % PLAYER_COLORS.length]!"
        />
      </nav>

      <p v-if="auth.isLoggedIn" class="text-sm text-white/50">
        Connecté en tant que
        <span class="font-semibold text-white/80">{{ auth.session!.username }}</span> ·
        <button type="button" class="text-cyan-400" @click="auth.logout()">Déconnexion</button>
      </p>
      <p v-else class="text-sm text-white/50">
        <RouterLink to="/inscription" class="text-cyan-400">S'inscrire</RouterLink>
        ·
        <RouterLink to="/connexion" class="text-white/60">Se connecter</RouterLink>
      </p>
    </div>
  </div>
</template>

<style scoped>
@keyframes duck-bg-drift {
  0%,
  100% {
    transform: scale(1.15) translate(0, 0);
  }
  50% {
    transform: scale(1.25) translate(-2%, 1.5%);
  }
}

.animated-bg {
  animation: duck-bg-drift 30s ease-in-out infinite;
  will-change: transform;
}

@media (prefers-reduced-motion: reduce) {
  .animated-bg {
    animation: none;
  }
}
</style>

<script setup lang="ts">
import { computed } from "vue";
import { PLAYER_COLORS } from "../theme.js";
import MenuCard from "../components/molecules/MenuCard.vue";
import { useAuthStore } from "../store/authStore.js";
import { useSettingsStore } from "../store/settingsStore.js";

const auth = useAuthStore();
const settings = useSettingsStore();

/**
 * L'image de fond est la même dans les deux thèmes, mais pas son traitement :
 * assombrie pour que du texte clair passe dessus, éclaircie et effacée pour
 * que du texte foncé passe. Le dégradé, lui, part de la couleur de fond du
 * thème, donc il suit tout seul.
 */
const backgroundFilter = computed(() =>
  settings.theme === "light" ? "brightness-125 opacity-40" : "brightness-[0.35]",
);

const menu = [
  { to: "/jouer", label: "Jouer", desc: "Choisis un mode et lance une partie" },
  { to: "/creatif", label: "Créatif", desc: "Crée et teste tes propres cartes" },
  { to: "/classement", label: "Classement", desc: "Les meilleurs joueurs, et toi" },
  { to: "/credits", label: "Crédits", desc: "Qui a fait ce jeu" },
  { to: "/options", label: "Options", desc: "Réglages du jeu" },
];

function hideOnError(event: Event) {
  (event.target as HTMLImageElement).style.display = "none";
}
</script>

<template>
  <div class="relative h-full w-full overflow-hidden text-ink">
    <img
      src="/duck.png"
      alt=""
      aria-hidden="true"
      :class="backgroundFilter"
      class="animated-bg absolute inset-0 h-full w-full object-cover blur-md"
    />
    <div
      class="absolute inset-0 bg-gradient-to-b from-surface-deep/30 via-surface-deep/70 to-surface-deep"
    />

    <div
      class="relative z-10 flex h-full flex-col items-center justify-center gap-8 px-4 py-8 text-center"
    >
      <div>
        <div class="flex items-center justify-center gap-3">
          <!-- Le canard, en attendant une vraie mascotte dessinée : même image
               que le favicon et l'icône installée, pour ne pas présenter trois
               visages différents du même jeu. -->
          <img
            src="/duck-mark.png"
            alt=""
            class="h-16 w-16 object-contain drop-shadow-lg"
            @error="hideOnError"
          />
          <h1 class="text-3xl font-extrabold sm:text-4xl">Bienvenue sur Duck</h1>
        </div>
        <p class="mt-2 text-ink/70">Rejoins la base adverse pour marquer des points.</p>
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

      <!-- Rien pour un joueur connecté : son pseudo et la déconnexion vivent
           dans le header, présent sur toutes les pages. Les répéter ici les
           donnait à deux endroits différents pour la même action. -->
      <p v-if="!auth.isLoggedIn" class="text-sm text-ink/50">
        <RouterLink to="/inscription" class="text-cyan-400">S'inscrire</RouterLink>
        ·
        <RouterLink to="/connexion" class="text-ink/60">Se connecter</RouterLink>
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

<script setup lang="ts">
import DuckAvatar from "../atoms/DuckAvatar.vue";
import IconButton from "../atoms/IconButton.vue";

/**
 * En-tête : la marque à gauche, l'accès au compte à droite.
 *
 * **Un seul bouton profil**, pas deux. Il y avait auparavant une pastille avec
 * l'initiale du pseudo ET une vignette canard menant aux skins : deux portes
 * vers la même chose, sans qu'on sache laquelle mène où. Tout passe désormais
 * par le profil, d'où l'on rejoint skins, informations et statistiques.
 */
defineProps<{ username?: string | null }>();
const emit = defineEmits<{ logout: [] }>();
</script>

<template>
  <header
    class="flex shrink-0 items-center justify-between border-b border-ink/10 px-4 py-3"
    style="padding-top: max(0.75rem, env(safe-area-inset-top))"
  >
    <RouterLink to="/" class="flex items-center gap-2">
      <DuckAvatar variant="logo" />
      <span class="text-lg font-bold tracking-wide">Duck</span>
    </RouterLink>

    <div class="flex items-center gap-2">
      <RouterLink
        :to="username ? '/compte' : '/connexion'"
        :aria-label="username ? `Profil de ${username}` : 'Se connecter'"
        :title="username ?? 'Se connecter'"
        class="flex h-9 items-center gap-2 rounded-lg border border-ink/10 bg-surface/80 px-3 text-ink/80 transition active:scale-95"
      >
        <i class="ri-user-line text-lg" aria-hidden="true" />
        <span v-if="username" class="max-w-24 truncate text-sm font-semibold">{{ username }}</span>
      </RouterLink>

      <!-- Déconnexion à portée de pouce, plutôt qu'enfouie dans le menu : c'est
           une action qu'on cherche quand on la cherche. -->
      <IconButton
        v-if="username"
        icon="ri-logout-box-r-line"
        label="Se déconnecter"
        @click="emit('logout')"
      />
    </div>
  </header>
</template>

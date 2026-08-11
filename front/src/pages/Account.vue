<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useAuthStore } from "../store/authStore.js";
import { fetchAccountProfile, type AccountProfile } from "../lib/accountApi.js";
import { winRatioPercent } from "../lib/stats.js";

const auth = useAuthStore();
const profile = ref<AccountProfile | null>(null);
const loading = ref(true);

onMounted(async () => {
  if (auth.session) profile.value = (await fetchAccountProfile(auth.session.token)) ?? null;
  loading.value = false;
});

const ratio = computed(() =>
  profile.value ? winRatioPercent(profile.value.stats.played, profile.value.stats.won) : 0,
);
</script>

<template>
  <div class="mx-auto flex h-full max-w-sm flex-col gap-6 overflow-y-auto px-4 py-6">
    <h1 class="text-2xl font-bold">Mon compte</h1>

    <p v-if="!auth.isLoggedIn" class="text-white/60">
      <RouterLink to="/connexion" class="text-cyan-400">Connecte-toi</RouterLink>
      pour voir ton compte.
    </p>

    <template v-else-if="loading">
      <p class="text-white/50">Chargement...</p>
    </template>

    <template v-else-if="profile">
      <section class="flex flex-col gap-1 rounded-xl bg-white/5 p-4">
        <h2 class="text-sm font-semibold text-white/70">Informations</h2>
        <p class="text-sm">
          <span class="text-white/50">Pseudo</span> ·
          <span class="font-semibold">{{ profile.username }}</span>
        </p>
        <p class="text-sm"><span class="text-white/50">Email</span> · {{ profile.email }}</p>
      </section>

      <section class="flex flex-col gap-3 rounded-xl bg-white/5 p-4">
        <h2 class="text-sm font-semibold text-white/70">Statistiques</h2>
        <div class="grid grid-cols-3 gap-2 text-center">
          <div>
            <p class="text-2xl font-bold">{{ profile.stats.played }}</p>
            <p class="text-xs text-white/50">Parties jouées</p>
          </div>
          <div>
            <p class="text-2xl font-bold">{{ profile.stats.won }}</p>
            <p class="text-xs text-white/50">Victoires</p>
          </div>
          <div>
            <p class="text-2xl font-bold">{{ ratio }}%</p>
            <p class="text-xs text-white/50">Taux de victoire</p>
          </div>
        </div>
      </section>

      <RouterLink
        to="/canard"
        class="rounded-xl bg-white/5 p-4 text-sm font-semibold text-white/70 active:bg-white/10"
      >
        Mes skins →
      </RouterLink>
    </template>

    <p v-else class="text-white/60">Impossible de charger ton compte pour le moment.</p>
  </div>
</template>

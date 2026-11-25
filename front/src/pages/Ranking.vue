<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { fetchRanking, type Ranking } from "../lib/rankingApi.js";
import { useAuthStore } from "../store/authStore.js";

/**
 * Classement général. Le top 10 par défaut, une recherche par pseudo ensuite.
 *
 * Le rang affiché est toujours le rang GÉNÉRAL, y compris dans une recherche :
 * numéroter les résultats 1, 2, 3 laisserait croire que les joueurs trouvés
 * sont en tête.
 */
const auth = useAuthStore();
const ranking = ref<Ranking>({ top: [] });
const search = ref("");
const loading = ref(true);

async function refresh() {
  loading.value = true;
  ranking.value = await fetchRanking(search.value, auth.session?.username);
  loading.value = false;
}

onMounted(refresh);

// Recherche déclenchée après une pause de frappe : une requête par lettre
// n'apporterait rien de plus au joueur, et beaucoup de bruit au serveur.
let debounce: ReturnType<typeof setTimeout> | undefined;
watch(search, () => {
  clearTimeout(debounce);
  debounce = setTimeout(refresh, 300);
});
</script>

<template>
  <div class="mx-auto flex h-full max-w-md flex-col gap-4 overflow-y-auto px-4 py-6">
    <h1 class="text-2xl font-bold">Classement</h1>

    <div class="flex items-center gap-2 rounded-lg border border-ink/10 bg-surface px-3">
      <i class="ri-search-line text-ink/40" aria-hidden="true" />
      <input
        v-model="search"
        type="search"
        placeholder="Chercher un joueur"
        aria-label="Chercher un joueur"
        class="w-full bg-transparent py-2 text-sm text-ink outline-none placeholder:text-ink/40"
      />
    </div>

    <p v-if="loading" class="text-center text-sm text-ink/40">Chargement…</p>

    <p v-else-if="ranking.top.length === 0" class="text-center text-sm text-ink/40">
      {{ search ? "Aucun joueur à ce nom." : "Personne au classement pour l'instant." }}
    </p>

    <ul v-else class="flex flex-col gap-1">
      <li
        v-for="player in ranking.top"
        :key="player.username"
        class="flex items-center gap-3 rounded-lg border border-ink/10 px-3 py-2"
        :class="player.username === auth.session?.username ? 'bg-cyan-500/15' : 'bg-surface'"
      >
        <span class="w-10 shrink-0 text-sm font-bold text-ink/40">{{ player.rank }}</span>
        <span class="flex-1 truncate text-sm font-semibold">{{ player.username }}</span>
        <span class="shrink-0 text-sm text-ink/60">{{ player.rating }}</span>
      </li>

      <!-- Hors du top : le joueur connecté vient quand même, à sa vraie
           place. Les points de suspension disent qu'il y a du monde entre. -->
      <template v-if="ranking.viewer">
        <li class="py-1 text-center text-xs text-ink/30">⋯</li>
        <li
          class="flex items-center gap-3 rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-3 py-2"
        >
          <span class="w-10 shrink-0 text-sm font-bold text-ink/60">{{ ranking.viewer.rank }}</span>
          <span class="flex-1 truncate text-sm font-semibold">{{ ranking.viewer.username }}</span>
          <span class="shrink-0 text-sm text-ink/60">{{ ranking.viewer.rating }}</span>
        </li>
      </template>
    </ul>
  </div>
</template>

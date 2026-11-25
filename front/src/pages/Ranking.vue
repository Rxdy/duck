<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
import IconButton from "../components/atoms/IconButton.vue";
import RankingRow from "../components/molecules/RankingRow.vue";
import RankingPodium from "../components/organisms/RankingPodium.vue";
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

// Le podium n'a de sens que sur le classement général : les résultats d'une
// recherche ne sont pas les trois premiers.
const showPodium = computed(() => ranking.value.top[0]?.rank === 1 && !search.value.trim());
const listed = computed(() => (showPodium.value ? ranking.value.top.slice(3) : ranking.value.top));

const searching = ref(false);
const searchField = ref<HTMLInputElement | null>(null);

async function toggleSearch() {
  searching.value = !searching.value;
  if (!searching.value) search.value = "";
  await nextTick();
  searchField.value?.focus();
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
  <!-- Tout tient sur un écran : les lignes se partagent la hauteur restante.
       Couché ou sur grand écran, le podium passe à gauche de la liste. -->
  <div
    class="mx-auto flex h-full max-w-md flex-col gap-2 overflow-hidden px-3 py-3 short:max-w-4xl short:flex-row short:gap-4 short:py-2 lg:max-w-4xl lg:flex-row lg:items-center lg:gap-8"
  >
    <div class="flex shrink-0 flex-col gap-2 short:w-2/5 short:justify-center lg:w-1/2 lg:gap-6">
      <div class="flex items-center justify-between gap-3">
        <h1 class="text-2xl font-bold lg:text-3xl">Classement</h1>
        <IconButton
          :icon="searching ? 'ri-close-line' : 'ri-search-line'"
          :label="searching ? 'Fermer la recherche' : 'Chercher un joueur'"
          @click="toggleSearch"
        />
      </div>

      <!-- La recherche reste à portée sans prendre de place au classement. -->
      <input
        v-if="searching"
        ref="searchField"
        v-model="search"
        type="search"
        placeholder="Chercher un joueur"
        aria-label="Chercher un joueur"
        class="panel w-full rounded-lg px-3 py-1.5 text-sm text-ink outline-none placeholder:text-ink/40"
      />

      <RankingPodium
        v-if="showPodium && !loading"
        :players="ranking.top.slice(0, 3)"
        :me="auth.session?.username"
      />
    </div>

    <div class="flex min-h-0 flex-1 flex-col justify-center lg:h-full lg:max-h-[40rem]">
      <p v-if="loading" class="text-center text-sm text-ink/40">Chargement…</p>

      <p v-else-if="ranking.top.length === 0" class="text-center text-sm text-ink/40">
        {{ search ? "Aucun joueur à ce nom." : "Personne au classement pour l'instant." }}
      </p>

      <!-- Les dix premiers, et une onzième ligne pour le joueur connecté qui
           n'y est pas, avec son vrai rang. -->
      <ul v-else class="flex min-h-0 flex-1 flex-col justify-center gap-1">
        <RankingRow
          v-for="player in listed"
          :key="player.username"
          :player="player"
          :highlight="player.username === auth.session?.username"
        />
        <RankingRow v-if="ranking.viewer" :player="ranking.viewer" highlight />
      </ul>
    </div>
  </div>
</template>

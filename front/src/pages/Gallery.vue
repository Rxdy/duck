<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { toPlacedTiles } from "../lib/mapEditor.js";
import { copyPublicMap, fetchPublicMaps, type PublicMap } from "../lib/mapsApi.js";
import { releaseThumbnailRenderer } from "../lib/mapThumbnail.js";
import { useAuthStore } from "../store/authStore.js";
import { useTestSessionStore } from "../store/testSessionStore.js";
import BoardViewDialog from "../components/molecules/BoardViewDialog.vue";
import MapCard from "../components/molecules/MapCard.vue";

/**
 * La galerie : les cartes que les joueurs ont publiées depuis « Mes cartes ». On les cherche par nom
 * ou par auteur, on les essaie contre des bots, ou on les copie chez soi pour les retoucher.
 */
const router = useRouter();
const auth = useAuthStore();
const testSession = useTestSessionStore();

const search = ref("");
const maps = ref<PublicMap[]>([]);
const page = ref(0);
const hasMore = ref(false);
const loading = ref(false);
const failed = ref(false);
const notice = ref("");

const selectedId = ref<string | null>(null);
const previewing = ref(false);
const selected = computed(() => maps.value.find((m) => m.id === selectedId.value));
const selectedTiles = computed(() => (selected.value ? toPlacedTiles(selected.value) : []));

async function load(reset: boolean) {
  loading.value = true;
  const next = reset ? 0 : page.value + 1;
  const result = await fetchPublicMaps(search.value, next);
  loading.value = false;
  failed.value = !result;
  if (!result) return;
  page.value = next;
  maps.value = reset ? result.maps : [...maps.value, ...result.maps];
  hasMore.value = result.hasMore;
}

onMounted(() => load(true));
onUnmounted(releaseThumbnailRenderer);

// Recherche au fil de la frappe, sans interroger le serveur à chaque lettre.
let typing: ReturnType<typeof setTimeout> | undefined;
watch(search, () => {
  clearTimeout(typing);
  typing = setTimeout(() => load(true), 300);
});
onUnmounted(() => clearTimeout(typing));

const modeLabel = (spawns: number) => (spawns === 4 ? "FFA 4" : "Duel");

function tryIt() {
  if (!selected.value) return;
  testSession.setMap(selected.value, "/creatif/galerie");
  router.push("/creatif/test");
}

async function copyIt() {
  const map = selected.value;
  selectedId.value = null;
  if (!map || !auth.session) return;
  const copied = await copyPublicMap(auth.session.token, map.id);
  notice.value = copied
    ? `« ${copied.name} » est dans Mes cartes.`
    : "Copie impossible : serveur injoignable ou carte retirée.";
}

function preview() {
  previewing.value = true;
}
</script>

<template>
  <div class="mx-auto flex h-full max-w-4xl flex-col gap-3 px-4 py-4 short:py-2">
    <div class="flex items-center gap-3">
      <RouterLink
        to="/creatif"
        aria-label="Retour au menu Créatif"
        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-ink/10 bg-surface/80"
      >
        <i class="ri-arrow-left-line" aria-hidden="true" />
      </RouterLink>
      <h1 class="text-2xl font-bold">Galerie</h1>
      <input
        id="gallery-search"
        v-model="search"
        type="search"
        placeholder="Nom ou auteur"
        aria-label="Chercher une carte par nom ou par auteur"
        class="ml-auto w-40 min-w-0 rounded-lg border border-ink/10 bg-ink/10 px-3 py-2 text-sm text-ink placeholder:text-ink/40 sm:w-56"
      />
    </div>

    <p v-if="notice" role="status" class="text-center text-xs text-amber-400">{{ notice }}</p>
    <p v-if="failed" class="text-center text-sm text-ink/60">
      La galerie ne répond pas.
      <button type="button" class="text-cyan-400 underline" @click="load(true)">Réessayer</button>
    </p>

    <!-- Seule la liste défile : la recherche reste en haut. -->
    <div v-if="maps.length" class="min-h-0 flex-1 overflow-y-auto pb-2">
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <MapCard
          v-for="map in maps"
          :key="map.id"
          :map="map"
          :subtitle="`${modeLabel(map.spawnCount)} · par ${map.author}`"
          @open="selectedId = map.id"
        />
      </div>
      <button
        v-if="hasMore"
        type="button"
        class="mx-auto mt-3 block rounded-lg bg-ink/10 px-4 py-2 text-sm text-ink/70"
        :disabled="loading"
        @click="load(false)"
      >
        Voir plus
      </button>
    </div>
    <p v-else-if="!loading && !failed" class="text-center text-sm text-ink/50">
      {{
        search.trim()
          ? "Aucune carte ne correspond."
          : "Aucune carte publiée pour l'instant. Publie la tienne depuis Mes cartes."
      }}
    </p>

    <!-- Les actions d'une carte, en bas de l'écran comme dans Mes cartes. -->
    <div
      v-if="selected && !previewing"
      class="fixed inset-0 z-50 flex items-end justify-center bg-surface-deep/80"
      role="dialog"
      aria-modal="true"
      :aria-label="`Actions pour la carte ${selected.name}`"
      @click.self="selectedId = null"
    >
      <div class="flex w-full max-w-md flex-col gap-1 rounded-t-2xl bg-surface p-3 pb-6">
        <p class="truncate px-2 pt-1 text-sm font-semibold">{{ selected.name }}</p>
        <p class="truncate px-2 pb-1 text-xs text-ink/50">
          {{ modeLabel(selected.spawnCount) }} · par {{ selected.author }}
        </p>
        <button
          type="button"
          class="flex items-center gap-3 rounded-lg px-3 py-3 text-left text-sm active:bg-ink/10"
          @click="tryIt"
        >
          <i class="ri-play-line text-lg text-ink/60" aria-hidden="true" />
          Essayer contre des bots
        </button>
        <button
          type="button"
          class="flex items-center gap-3 rounded-lg px-3 py-3 text-left text-sm active:bg-ink/10"
          @click="preview"
        >
          <i class="ri-eye-line text-lg text-ink/60" aria-hidden="true" />
          Voir un aperçu
        </button>
        <button
          type="button"
          class="flex items-center gap-3 rounded-lg px-3 py-3 text-left text-sm active:bg-ink/10"
          @click="copyIt"
        >
          <i class="ri-file-copy-line text-lg text-ink/60" aria-hidden="true" />
          Copier dans Mes cartes
        </button>
      </div>
    </div>

    <BoardViewDialog
      v-if="selected && previewing"
      :width="selected.width"
      :height="selected.height"
      :tiles="selectedTiles"
      @close="((previewing = false), (selectedId = null))"
    />
  </div>
</template>

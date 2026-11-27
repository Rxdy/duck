<script setup lang="ts">
import { onMounted, ref } from "vue";
import { fetchMyMaps } from "../lib/mapsApi.js";
import { useAuthStore } from "../store/authStore.js";
import { useCreativeEditorStore } from "../store/creativeEditorStore.js";

/**
 * L'entrée du mode créatif : un menu court, comme celui des options, vers l'éditeur et les cartes
 * enregistrées, et la galerie des cartes publiées (#33).
 */
const auth = useAuthStore();
const editor = useCreativeEditorStore();
const mapCount = ref<number | undefined>();

onMounted(async () => {
  if (auth.session) mapCount.value = (await fetchMyMaps(auth.session.token)).length;
});

const plural = (n: number) => (n > 1 ? "s" : "");
</script>

<template>
  <div class="mx-auto flex h-full max-w-md flex-col gap-3 overflow-y-auto px-4 py-4 short:py-2">
    <h1 class="text-2xl font-bold">Créatif</h1>

    <nav class="grid grid-cols-1 gap-3 short:grid-cols-2">
      <RouterLink
        to="/creatif/editeur"
        class="panel flex items-center gap-3 rounded-2xl p-4 transition active:scale-[0.98] short:p-3"
      >
        <i class="ri-edit-box-fill accent-icon text-2xl" aria-hidden="true" />
        <span class="min-w-0 flex-1">
          <span class="block font-bold">Éditeur de cartes</span>
          <span class="block truncate text-xs text-ink/60">
            {{
              editor.mapName.trim()
                ? `Reprendre « ${editor.mapName.trim()} »`
                : "Murs, bases et taille de la carte"
            }}
          </span>
        </span>
        <i class="ri-arrow-right-s-line text-xl text-ink/40" aria-hidden="true" />
      </RouterLink>

      <RouterLink
        to="/creatif/cartes"
        class="panel flex items-center gap-3 rounded-2xl p-4 transition active:scale-[0.98] short:p-3"
      >
        <i class="ri-map-2-fill accent-icon text-2xl" aria-hidden="true" />
        <span class="min-w-0 flex-1">
          <span class="block font-bold">Mes cartes</span>
          <span class="block truncate text-xs text-ink/60">
            {{
              mapCount === undefined
                ? "Ouvrir, partager, importer"
                : mapCount === 0
                  ? "Aucune carte enregistrée"
                  : `${mapCount} carte${plural(mapCount)} enregistrée${plural(mapCount)}`
            }}
          </span>
        </span>
        <i class="ri-arrow-right-s-line text-xl text-ink/40" aria-hidden="true" />
      </RouterLink>

      <RouterLink
        to="/creatif/galerie"
        class="panel flex items-center gap-3 rounded-2xl p-4 transition active:scale-[0.98] short:p-3"
      >
        <i class="ri-earth-fill accent-icon text-2xl" aria-hidden="true" />
        <span class="min-w-0 flex-1">
          <span class="block font-bold">Galerie</span>
          <span class="block truncate text-xs text-ink/60"
            >Les cartes publiées par les joueurs</span
          >
        </span>
        <i class="ri-arrow-right-s-line text-xl text-ink/40" aria-hidden="true" />
      </RouterLink>
    </nav>
  </div>
</template>

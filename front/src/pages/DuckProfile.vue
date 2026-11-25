<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useAuthStore } from "../store/authStore.js";
import { equipSkin as equipSkinApi, fetchOwnedSkins, type OwnedSkin } from "../lib/skinsApi.js";
import { accessoryIcon, toAccessoryKind } from "../lib/duckAccessories.js";
import BoardPreview from "../components/organisms/BoardPreview.vue";

const auth = useAuthStore();
const ownedSkins = ref<OwnedSkin[]>([]);
const equipping = ref<string | null>(null);

// Couleur neutre pour l'aperçu : la vraie couleur en partie dépend de l'ordre
// d'arrivée dans la salle (voir back/src/shared.ts#PLAYER_COLORS), pas du
// compte — rien à prévisualiser de ce côté-là, seul l'accessoire compte ici.
const PREVIEW_COLOR = "#FFB100";

const equippedAccessory = computed(
  () => ownedSkins.value.find((s) => s.equipped)?.accessory ?? "none",
);
const previewPlayers = computed(() => [
  { id: "preview", x: 0, y: 0, color: PREVIEW_COLOR, accessory: equippedAccessory.value },
]);

onMounted(async () => {
  if (auth.session) ownedSkins.value = await fetchOwnedSkins(auth.session.token);
});

async function handleEquip(skinId: string) {
  if (!auth.session || equipping.value) return;
  equipping.value = skinId;
  const success = await equipSkinApi(auth.session.token, skinId);
  if (success) {
    ownedSkins.value = ownedSkins.value.map((skin) => ({ ...skin, equipped: skin.id === skinId }));
  }
  equipping.value = null;
}
</script>

<template>
  <div class="flex h-full flex-col items-center gap-6 overflow-y-auto px-4 py-6 text-center">
    <h1 class="text-2xl font-bold">Mon canard</h1>

    <p v-if="!auth.isLoggedIn" class="text-ink/60">
      <RouterLink to="/connexion" class="text-cyan-400">Connecte-toi</RouterLink>
      pour gérer les skins de ton canard.
    </p>

    <template v-else>
      <div class="h-40 w-40 shrink-0 overflow-hidden rounded-xl bg-surface">
        <BoardPreview :width="1" :height="1" :players="previewPlayers" />
      </div>

      <p class="text-ink/60">
        Un skin est un accessoire porté par ton canard — un seul équipé à la fois.
      </p>

      <div class="flex flex-wrap justify-center gap-3">
        <button
          v-for="skin in ownedSkins"
          :key="skin.id"
          type="button"
          class="flex flex-col items-center gap-1 rounded-lg px-3 py-2 transition"
          :class="skin.equipped ? 'bg-ink/10' : ''"
          :disabled="equipping === skin.id"
          @click="handleEquip(skin.id)"
        >
          <span class="text-3xl">{{ accessoryIcon(toAccessoryKind(skin.accessory)) }}</span>
          <span class="text-xs text-ink/60">{{ skin.name }}</span>
        </button>
      </div>
    </template>
  </div>
</template>

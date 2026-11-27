<script setup lang="ts">
// Les 4 places à coffres de l'accueil : vides, en attente, en cours d'ouverture ou prêts. Un appui
// lance l'ouverture d'un coffre en attente, ou ouvre un coffre prêt et montre ce qu'il contenait.
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import ChestIcon from "../atoms/ChestIcon.vue";
import ChestOpening from "../organisms/ChestOpening.vue";
import { CHEST_LOOK, CHEST_SLOTS, formatDuration } from "../../lib/chests.js";
import type { Chest } from "../../lib/chestsApi.js";
import { useAuthStore } from "../../store/authStore.js";
import { useChestStore } from "../../store/chestStore.js";
import { useWardrobeStore } from "../../store/wardrobeStore.js";

const auth = useAuthStore();
const store = useChestStore();
const wardrobe = useWardrobeStore();

const slots = computed(() =>
  Array.from({ length: CHEST_SLOTS }, (_, i) => store.chests[i] as Chest | undefined),
);
const busy = computed(() => store.chests.some((c) => c.state === "unlocking"));

// L'horloge du décompte : elle ne tourne que pendant une ouverture.
const now = ref(performance.now());
let timer: ReturnType<typeof setInterval> | undefined;
watch(
  busy,
  (running) => {
    clearInterval(timer);
    if (!running) return;
    // Repartir de l'heure actuelle : l'horloge a pu rester figée depuis l'arrivée sur la page.
    now.value = performance.now();
    timer = setInterval(() => {
      now.value = performance.now();
      // Le temps est écoulé ici : on relit, le serveur confirme que le coffre est prêt.
      if (
        store.chests.some((c) => c.state === "unlocking" && store.remaining(c, now.value) === 0)
      ) {
        void store.refresh(auth.session?.token);
      }
    }, 1000);
  },
  { immediate: true },
);
onMounted(() => store.refresh(auth.session?.token));
onUnmounted(() => clearInterval(timer));

/** Le coffre prêt qu'on a touché : il passe en grand, l'ouverture se fait là (ChestOpening). */
const opening = ref<Chest | null>(null);
const working = ref(false);

async function tap(chest: Chest | undefined) {
  const token = auth.session?.token;
  if (!chest || !token || working.value) return;
  if (chest.state === "ready") {
    opening.value = chest;
    return;
  }
  if (chest.state !== "waiting") return;
  working.value = true;
  await store.unlock(token, chest.id);
  working.value = false;
}

async function openNow(): Promise<string[] | undefined> {
  const token = auth.session?.token;
  if (!token || !opening.value) return undefined;
  const items = await store.open(token, opening.value.id);
  if (items) void wardrobe.refresh(token);
  return items;
}

function label(chest: Chest): string {
  if (chest.state === "ready") return "Ouvrir";
  if (chest.state === "unlocking") return formatDuration(store.remaining(chest, now.value), true);
  return formatDuration(chest.unlockMs);
}
</script>

<template>
  <section
    aria-label="Tes coffres"
    class="flex w-full max-w-sm flex-col gap-1 md:max-w-xl roomy:max-w-2xl"
  >
    <div class="grid grid-cols-4 gap-2 md:gap-3 roomy:gap-4">
      <template v-for="(chest, index) in slots" :key="chest?.id ?? `vide-${index}`">
        <button
          v-if="chest"
          type="button"
          class="chest-slot panel relative flex flex-col items-center gap-0.5 overflow-hidden rounded-2xl px-1 pb-2 pt-2 transition active:scale-95 disabled:opacity-60 tiny:pb-1.5 tiny:pt-1 short:pb-1 short:pt-1 md:pb-3 md:pt-3"
          :class="chest.state === 'ready' ? 'chest-ready' : ''"
          :style="{ '--chest': CHEST_LOOK[chest.rarity].color }"
          :disabled="working || (chest.state === 'waiting' && busy)"
          :aria-label="`Coffre ${CHEST_LOOK[chest.rarity].name} : ${
            chest.state === 'ready'
              ? 'prêt, à ouvrir'
              : chest.state === 'unlocking'
                ? `ouverture en cours, ${label(chest)}`
                : `en attente, ${label(chest)} pour l'ouvrir`
          }`"
          @click="tap(chest)"
        >
          <span
            class="h-11 w-14 tiny:h-8 tiny:w-10 short:h-6 short:w-8 md:h-16 md:w-20 roomy:h-20 roomy:w-24"
          >
            <ChestIcon :rarity="chest.rarity" :open="false" />
          </span>
          <span
            class="text-[10px] font-semibold uppercase tracking-wider tiny:hidden short:hidden md:text-xs"
            :style="{ color: CHEST_LOOK[chest.rarity].color }"
          >
            {{ CHEST_LOOK[chest.rarity].name }}
          </span>
          <span
            class="text-xs font-bold tabular-nums md:text-sm"
            :class="chest.state === 'ready' ? 'text-cyan-300' : 'text-ink/70'"
          >
            {{ label(chest) }}
          </span>
          <!-- Pendant l'ouverture, la part déjà écoulée. -->
          <span
            v-if="chest.state === 'unlocking'"
            class="absolute inset-x-0 bottom-0 h-1 bg-ink/10"
            aria-hidden="true"
          >
            <span
              class="block h-full transition-[width] duration-1000 ease-linear"
              :style="{
                width: `${100 - (100 * store.remaining(chest, now)) / chest.unlockMs}%`,
                background: CHEST_LOOK[chest.rarity].color,
              }"
            />
          </span>
        </button>
        <div
          v-else
          aria-hidden="true"
          class="flex min-h-[5.5rem] items-center justify-center rounded-2xl border border-dashed border-ink/20 bg-surface-deep/70 tiny:min-h-[3.6rem] short:min-h-[2.8rem] md:min-h-[8rem] roomy:min-h-[9.5rem]"
        >
          <i class="ri-add-line text-ink/20 md:text-xl" />
        </div>
      </template>
    </div>
    <p v-if="store.message" role="status" class="text-center text-[11px] text-amber-400">
      {{ store.message }}
    </p>

    <ChestOpening v-if="opening" :chest="opening" :open="openNow" @close="opening = null" />
  </section>
</template>

<style scoped>
/* Prêt à ouvrir : un liseré et un léger halo de la couleur du coffre, qui respire. */
.chest-ready {
  border-color: var(--chest) !important;
  box-shadow: 0 0 14px color-mix(in srgb, var(--chest) 35%, transparent);
  animation: breathe 2.2s ease-in-out infinite;
}
@keyframes breathe {
  50% {
    box-shadow: 0 0 22px color-mix(in srgb, var(--chest) 55%, transparent);
  }
}
@media (prefers-reduced-motion: reduce) {
  .chest-ready {
    animation: none;
  }
}
</style>

<script setup lang="ts">
/**
 * L'ouverture d'un coffre, en plein écran. Un premier appui l'a fait venir en grand ; un deuxième
 * l'ouvre : il tremble, le couvercle saute dans un éclat de lumière, puis les accessoires sortent un
 * par un, portés par le canard. Chaque appui montre le suivant ; à la fin, le récapitulatif.
 * Animations réduites : pas de tremblement ni d'étincelles, les accessoires apparaissent simplement.
 */
import { computed, onMounted, onUnmounted, ref } from "vue";
import AccessoryThumb from "../atoms/AccessoryThumb.vue";
import AppButton from "../atoms/AppButton.vue";
import ChestIcon from "../atoms/ChestIcon.vue";
import DuckPortrait from "../atoms/DuckPortrait.vue";
import { CHEST_LOOK } from "../../lib/chests.js";
import type { Chest } from "../../lib/chestsApi.js";
import { accessoryName } from "../../lib/wardrobe.js";
import { useSettingsStore } from "../../store/settingsStore.js";

const props = defineProps<{
  chest: Chest;
  /** Ouvre le coffre côté serveur : les accessoires gagnés, ou undefined en cas d'échec. */
  open: () => Promise<string[] | undefined>;
}>();
const emit = defineEmits<{ close: [] }>();

const settings = useSettingsStore();
const look = computed(() => CHEST_LOOK[props.chest.rarity]);

type Phase = "closed" | "shaking" | "burst" | "item" | "summary" | "failed";
const phase = ref<Phase>("closed");
const items = ref<string[]>([]);
const index = ref(0);
const current = computed(() => items.value[index.value]);
const left = computed(() => items.value.length - index.value - 1);

const wait = (ms: number) => new Promise((r) => setTimeout(r, settings.reducedMotion ? 0 : ms));

async function openIt() {
  phase.value = "shaking";
  // Le tremblement dure au moins le temps de la demande : on ne voit jamais d'attente sèche.
  const [won] = await Promise.all([props.open(), wait(900)]);
  if (!won) {
    phase.value = "failed";
    return;
  }
  items.value = won;
  phase.value = "burst";
  await wait(700);
  phase.value = won.length ? "item" : "summary";
}

function tap() {
  if (phase.value === "closed") void openIt();
  else if (phase.value === "item") {
    if (index.value < items.value.length - 1) index.value++;
    else phase.value = "summary";
  }
}

// Le clavier aussi : Entrée ou espace avancent, Échap ferme quand c'est fini.
function onKey(event: KeyboardEvent) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    tap();
  } else if (event.key === "Escape" && (phase.value === "summary" || phase.value === "failed")) {
    emit("close");
  }
}
onMounted(() => window.addEventListener("keydown", onKey));
onUnmounted(() => window.removeEventListener("keydown", onKey));

// Étincelles : directions fixées une fois pour toutes, la couleur du coffre.
const SPARKS = Array.from({ length: 14 }, (_, i) => {
  const angle = (i / 14) * Math.PI * 2 + (i % 2) * 0.2;
  const distance = 110 + (i % 3) * 40;
  return {
    "--dx": `${Math.cos(angle) * distance}px`,
    "--dy": `${Math.sin(angle) * distance - 40}px`,
    "--delay": `${(i % 4) * 40}ms`,
  };
});
</script>

<template>
  <Teleport to="body">
    <div
      class="chest-stage fixed inset-0 z-[60] flex select-none flex-col items-center justify-center gap-4 overflow-hidden bg-surface-deep px-4 text-center text-ink"
      :style="{ '--chest': look.color }"
      role="dialog"
      aria-modal="true"
      :aria-label="`Ouverture du coffre ${look.name}`"
      @click="tap"
    >
      <!-- Le halo derrière le coffre, puis les rayons qui tournent une fois ouvert. -->
      <div class="chest-halo" :class="{ 'chest-halo-strong': phase !== 'closed' }" />
      <div v-if="phase === 'burst' || phase === 'item'" class="chest-rays" />

      <p class="relative text-sm uppercase tracking-[0.3em] text-ink/60">Coffre {{ look.name }}</p>

      <!-- Le coffre, tant qu'il n'a pas livré ses accessoires. -->
      <div
        v-if="phase === 'closed' || phase === 'shaking' || phase === 'burst' || phase === 'failed'"
        class="relative mt-6 h-48 w-56 sm:h-60 sm:w-72"
      >
        <div
          class="h-full w-full"
          :class="{
            'chest-float': phase === 'closed',
            'chest-shake': phase === 'shaking',
            'chest-pop': phase === 'burst',
          }"
        >
          <ChestIcon :rarity="chest.rarity" :open="phase === 'burst'" />
        </div>
        <template v-if="phase === 'burst' && !settings.reducedMotion">
          <span v-for="(spark, i) in SPARKS" :key="i" class="chest-spark" :style="spark" />
        </template>
      </div>

      <!-- Un accessoire à la fois, porté par le canard. -->
      <div
        v-else-if="phase === 'item' && current"
        :key="current"
        class="relative flex flex-col items-center gap-2"
      >
        <div class="item-in relative h-52 w-52 sm:h-64 sm:w-64">
          <DuckPortrait :outfit="[current]" class="duck-glow h-full w-full" />
          <div
            class="absolute -bottom-2 -right-2 h-16 w-16 rounded-2xl border border-ink/15 bg-surface p-1"
          >
            <AccessoryThumb :id="current" class="h-full w-full" />
          </div>
        </div>
        <p class="item-name text-2xl font-bold">{{ accessoryName(current) }}</p>
        <p class="text-xs text-ink/50">
          {{ left > 0 ? `Encore ${left}` : "Le dernier" }}
        </p>
      </div>

      <!-- Le récapitulatif. -->
      <div
        v-else-if="phase === 'summary'"
        class="relative flex w-full max-w-md flex-col items-center gap-4"
        @click.stop
      >
        <p v-if="!items.length" class="text-sm text-ink/70">
          Tu as déjà tous les accessoires : ce coffre était vide.
        </p>
        <ul v-else class="flex max-w-[19rem] flex-wrap justify-center gap-3">
          <li
            v-for="(item, i) in items"
            :key="item"
            class="summary-in flex w-20 flex-col items-center gap-1"
            :style="{ animationDelay: `${i * 70}ms` }"
          >
            <span class="h-20 w-20 rounded-2xl border border-ink/15 bg-surface p-1.5">
              <AccessoryThumb :id="item" class="h-full w-full" />
            </span>
            <span class="text-[11px] text-ink/70">{{ accessoryName(item) }}</span>
          </li>
        </ul>
        <div class="flex w-full max-w-xs gap-2">
          <AppButton class="flex-1" @click="emit('close')">Fermer</AppButton>
          <AppButton v-if="items.length" class="flex-1" variant="primary" to="/canard">
            Garde-robe
          </AppButton>
        </div>
      </div>

      <p v-if="phase === 'closed'" class="relative animate-pulse text-sm text-ink/70">
        Touche pour l'ouvrir
      </p>
      <p v-else-if="phase === 'item'" class="relative text-xs text-ink/40">Touche pour continuer</p>
      <div
        v-else-if="phase === 'failed'"
        class="relative flex flex-col items-center gap-3"
        @click.stop
      >
        <p class="text-sm text-amber-400">
          Le coffre ne s'est pas ouvert. Réessaie dans un instant.
        </p>
        <AppButton @click="emit('close')">Fermer</AppButton>
      </div>

      <button
        v-if="phase === 'closed'"
        type="button"
        aria-label="Fermer sans ouvrir"
        class="absolute right-[max(1rem,env(safe-area-inset-right))] top-[max(1rem,env(safe-area-inset-top))] flex h-10 w-10 items-center justify-center rounded-full bg-surface/80 text-ink/70"
        @click.stop="emit('close')"
      >
        <i class="ri-close-line text-xl" aria-hidden="true" />
      </button>
    </div>
  </Teleport>
</template>

<style scoped>
.chest-halo {
  position: absolute;
  width: 36rem;
  height: 36rem;
  border-radius: 9999px;
  background: radial-gradient(
    circle,
    color-mix(in srgb, var(--chest) 30%, transparent) 0%,
    transparent 60%
  );
  transition:
    transform 0.6s ease,
    opacity 0.6s ease;
  opacity: 0.6;
}
.chest-halo-strong {
  transform: scale(1.35);
  opacity: 1;
}
.chest-rays {
  position: absolute;
  width: 60rem;
  height: 60rem;
  background: repeating-conic-gradient(
    from 0deg,
    color-mix(in srgb, var(--chest) 16%, transparent) 0deg 8deg,
    transparent 8deg 24deg
  );
  mask-image: radial-gradient(circle, #000 0%, transparent 55%);
  animation:
    rays 14s linear infinite,
    fade-in 0.5s ease both;
}
.chest-float {
  animation: float 2.4s ease-in-out infinite;
}
.chest-shake {
  animation: shake 0.45s ease-in-out infinite;
}
.chest-pop {
  animation: pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
.chest-spark {
  position: absolute;
  left: 50%;
  top: 45%;
  width: 9px;
  height: 9px;
  border-radius: 2px;
  background: var(--chest);
  box-shadow: 0 0 10px var(--chest);
  animation: spark 0.8s ease-out var(--delay) both;
}
.item-in {
  animation: item-in 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
.item-name {
  animation: fade-up 0.4s ease 0.2s both;
}
.summary-in {
  animation: fade-up 0.35s ease both;
}
@keyframes float {
  50% {
    transform: translateY(-10px);
  }
}
@keyframes shake {
  0%,
  100% {
    transform: rotate(0) scale(1.03);
  }
  25% {
    transform: rotate(-6deg) scale(1.06);
  }
  75% {
    transform: rotate(6deg) scale(1.06);
  }
}
@keyframes pop {
  0% {
    transform: scale(1.1);
  }
  40% {
    transform: scale(1.25);
  }
  100% {
    transform: scale(1);
  }
}
@keyframes spark {
  0% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
  100% {
    transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(0.3) rotate(180deg);
    opacity: 0;
  }
}
@keyframes item-in {
  0% {
    transform: translateY(60px) scale(0.2) rotate(-12deg);
    opacity: 0;
  }
  100% {
    transform: none;
    opacity: 1;
  }
}
@keyframes fade-up {
  from {
    transform: translateY(10px);
    opacity: 0;
  }
}
@keyframes fade-in {
  from {
    opacity: 0;
  }
}
@keyframes rays {
  to {
    transform: rotate(360deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .chest-float,
  .chest-shake,
  .chest-pop,
  .chest-rays,
  .item-in,
  .item-name,
  .summary-in {
    animation: none;
  }
}
</style>

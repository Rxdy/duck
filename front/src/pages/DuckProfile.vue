<script setup lang="ts">
import { computed, ref, watch } from "vue";
import AccessoryThumb from "../components/atoms/AccessoryThumb.vue";
import AppButton from "../components/atoms/AppButton.vue";
import ModalDialog from "../components/molecules/ModalDialog.vue";
import DuckPortrait from "../components/atoms/DuckPortrait.vue";
import type { Slot } from "../lib/accessories/accessoires.js";
import {
  accessoryById,
  accessoryName,
  collection,
  hasUnsavedOutfit,
  type Show,
  randomOutfit,
  sameOutfit,
  SLOTS,
  wear,
} from "../lib/wardrobe.js";
import { useAuthStore } from "../store/authStore.js";
import { useLeaveGuard } from "../composables/useLeaveGuard.js";
import { useProgressiveList } from "../composables/useProgressiveList.js";
import { useWardrobeStore } from "../store/wardrobeStore.js";
import { PLAYER_COLORS } from "../theme.js";

const SLOT_ICONS: Record<Slot, string> = {
  tete: "ri-graduation-cap-line",
  visage: "ri-glasses-line",
  corps: "ri-t-shirt-line",
  dos: "ri-briefcase-4-line",
  main: "ri-hand",
};
const FILTERS = [{ value: "all" as const, label: "Tout" }, ...SLOTS];

const auth = useAuthStore();
const store = useWardrobeStore();
const wardrobe = computed(() => store.wardrobe);

const preset = ref(0);
/** Les trois tenues en cours de composition : changer d'onglet ne perd rien. */
const drafts = ref<string[][]>([[], [], []]);
const filter = ref<Slot | "all">("all");
const show = ref<Show>("all");
const saving = ref(false);
const message = ref("");
const back = ref(false);
// En partie, la couleur dépend de la place dans la salle, pas du compte : on peut les essayer.
const color = ref<string>(PLAYER_COLORS[0]!);

// À l'arrivée de la garde-robe (ou d'un autre compte), on part des tenues enregistrées.
let loaded = "";
watch(
  wardrobe,
  (value) => {
    const owner = auth.session?.token ?? "";
    if (!value || loaded === owner) return;
    loaded = owner;
    drafts.value = value.presets.map((p) => [...p]);
    // On ouvre sur la tenue enregistrée que le canard porte, s'il y en a une.
    preset.value = Math.max(
      0,
      value.presets.findIndex((p) => sameOutfit(p, value.outfit)),
    );
  },
  { immediate: true },
);
void store.refresh(auth.session?.token);

const draft = computed(() => drafts.value[preset.value]!);
const unsaved = (i: number) =>
  !!wardrobe.value && !sameOutfit(drafts.value[i]!, wardrobe.value.presets[i]!);

// Quitter avec une tenue modifiée et non enregistrée : on demande avant de la perdre.
const { asking: leaving, decide: decideLeaving } = useLeaveGuard(
  () =>
    !!wardrobe.value &&
    hasUnsavedOutfit(drafts.value, wardrobe.value.presets, wardrobe.value.outfit),
);

/** Ce qu'on voit est-il ce que le canard porte ? */
const wornNow = computed(() => !!wardrobe.value && sameOutfit(draft.value, wardrobe.value.outfit));
/** L'onglet dont la tenue enregistrée est celle que porte le canard. */
const isWornPreset = (i: number) => {
  const saved = wardrobe.value?.presets[i];
  return !!saved?.length && sameOutfit(saved, wardrobe.value!.outfit);
};

/** Les cinq emplacements, vides tant qu'on n'y a rien mis. */
const slots = computed(() =>
  SLOTS.map((slot) => ({
    ...slot,
    item: draft.value.find((id) => accessoryById(id)?.emplacement === slot.value),
  })),
);

const items = computed(() => collection(wardrobe.value?.owned ?? [], filter.value, show.value));

// La collection se charge petit à petit : elle peut grandir sans alourdir la page.
const { visible, scroller, onScroll } = useProgressiveList(
  items,
  () => `${filter.value}|${show.value}`,
);

/** La case « Aucun » vide l'emplacement trié : elle n'a pas de sens sur « Tout ». */
const nothingOn = computed(() => !slots.value.find((s) => s.value === filter.value)?.item);

function putNothing() {
  if (filter.value !== "all") put(filter.value, undefined);
}

function put(slot: Slot, id: string | undefined) {
  drafts.value[preset.value] = wear(draft.value, slot, id);
  message.value = "";
}

/** Un appui met la pièce à son emplacement (à la place de l'autre) ; un second la retire. */
function pick(item: { id: string; emplacement: Slot; owned: boolean }) {
  if (!item.owned) return;
  put(item.emplacement, draft.value.includes(item.id) ? undefined : item.id);
}

function tapSlot(slot: { value: Slot; item?: string }) {
  if (slot.item) put(slot.value, undefined);
  else filter.value = slot.value;
}

/** Une demande à la fois, et ce qui s'est passé dit au joueur. */
async function act(request: (token: string) => Promise<boolean>, done: string, failed: string) {
  if (!auth.session || saving.value) return false;
  saving.value = true;
  const ok = await request(auth.session.token);
  message.value = ok ? done : failed;
  saving.value = false;
  return ok;
}

/** Garde la tenue dans l'onglet choisi : le canard ne change pas. */
function save() {
  const target = preset.value;
  const outfit = [...draft.value];
  return act(
    (token) => store.save(token, target, outfit),
    `Tenue ${target + 1} enregistrée.`,
    "Tenue non enregistrée. Réessaie.",
  );
}

/** Habille le canard avec ce qu'on voit : les tenues enregistrées ne changent pas. */
function wearNow() {
  const outfit = [...draft.value];
  return act(
    (token) => store.wear(token, outfit),
    "Ton canard porte cette tenue.",
    "Tenue non portée. Réessaie.",
  );
}

function shuffle() {
  drafts.value[preset.value] = randomOutfit(wardrobe.value?.owned ?? [], draft.value);
  message.value = "";
}

/** Effacer une tenue enregistrée ne s'annule pas : on le confirme. */
const confirming = ref(false);
const canClear = computed(
  () => draft.value.length > 0 || !!wardrobe.value?.presets[preset.value]?.length,
);

async function clearPreset() {
  const target = preset.value;
  confirming.value = false;
  const cleared = await act(
    (token) => store.save(token, target, []),
    `Tenue ${target + 1} vidée.`,
    "La tenue n'a pas été vidée. Réessaie.",
  );
  if (cleared) drafts.value[target] = [];
}
</script>

<template>
  <div class="mx-auto flex h-full max-w-md flex-col gap-2 px-3 py-2 short:max-w-4xl lg:max-w-4xl">
    <div class="flex shrink-0 items-baseline justify-between gap-2">
      <h1 class="text-xl font-bold short:text-base">Garde-robe</h1>
      <div v-if="wardrobe" class="flex items-center gap-2">
        <p class="text-sm text-ink/60">{{ wardrobe.owned.length }}/{{ wardrobe.total }}</p>
        <select
          v-model="show"
          aria-label="Afficher les accessoires"
          class="rounded-lg border border-ink/15 bg-surface px-1.5 py-1 text-xs font-semibold"
        >
          <option value="all">Tous</option>
          <option value="owned">Débloqués</option>
          <option value="locked">À débloquer</option>
        </select>
      </div>
    </div>

    <p v-if="!auth.isLoggedIn" class="text-ink/60">
      <RouterLink to="/inscription" class="text-cyan-400">Inscris-toi</RouterLink>
      pour gagner des accessoires.
    </p>
    <p v-else-if="!wardrobe" class="text-sm text-ink/60">
      {{ store.loading ? "Chargement…" : "Garde-robe indisponible pour le moment." }}
    </p>

    <!-- Le canard reste en place ; seule la collection défile. -->
    <div v-else class="flex min-h-0 flex-1 flex-col gap-2 short:flex-row lg:flex-row lg:gap-4">
      <div class="flex shrink-0 flex-col gap-1.5 short:min-h-0 short:w-2/5 lg:min-h-0 lg:w-1/2">
        <div
          class="relative h-[26dvh] min-h-28 overflow-hidden rounded-xl short:h-auto short:min-h-0 short:flex-1 lg:h-auto lg:flex-1"
        >
          <div class="absolute inset-0 flex items-center justify-center p-1">
            <DuckPortrait
              :outfit="draft"
              :color="color"
              :back="back"
              class="duck-glow h-full w-full"
              :style="{ '--duck-glow': color }"
            />
          </div>
          <button
            type="button"
            class="panel absolute right-1.5 top-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold"
            :aria-pressed="back"
            :aria-label="back ? 'Voir de face' : 'Voir de dos'"
            @click="back = !back"
          >
            <i class="ri-refresh-line" aria-hidden="true" />
          </button>
          <div class="absolute bottom-1.5 left-1.5 flex flex-col gap-1">
            <button
              v-for="(option, i) in PLAYER_COLORS"
              :key="option"
              type="button"
              class="h-4 w-4 rounded-full border-2"
              :class="color === option ? 'border-ink' : 'border-transparent'"
              :style="{ backgroundColor: option }"
              :aria-label="`Essayer la couleur ${i + 1}`"
              :aria-pressed="color === option"
              @click="color = option"
            />
          </div>
          <div class="absolute bottom-1.5 right-1.5 flex flex-col items-end gap-1">
            <button
              type="button"
              class="panel rounded-lg px-2.5 py-1 text-xs font-semibold disabled:opacity-40"
              :disabled="!wardrobe.owned.length"
              @click="shuffle"
            >
              <i class="ri-shuffle-line" aria-hidden="true" /> Aléatoire
            </button>
            <button
              type="button"
              class="panel rounded-lg px-2.5 py-1 text-xs font-semibold disabled:opacity-40"
              :disabled="!canClear || saving"
              @click="confirming = true"
            >
              <i class="ri-delete-bin-line" aria-hidden="true" /> Vider
            </button>
          </div>
        </div>

        <div class="grid shrink-0 grid-cols-5 gap-1.5">
          <button
            v-for="slot in slots"
            :key="slot.value"
            type="button"
            :data-slot="slot.value"
            class="flex h-14 flex-col items-center justify-center rounded-xl border-2 tiny:h-11 short:h-11"
            :class="slot.item ? 'border-cyan-500 bg-surface' : 'border-dashed border-ink/20'"
            :aria-label="
              slot.item
                ? `${slot.label} : ${accessoryName(slot.item)}, retirer`
                : `${slot.label} : vide`
            "
            :title="slot.label"
            @click="tapSlot(slot)"
          >
            <AccessoryThumb v-if="slot.item" :id="slot.item" />
            <template v-else>
              <i class="text-lg text-ink/30" :class="SLOT_ICONS[slot.value]" aria-hidden="true" />
              <span class="text-[10px] leading-none text-ink/40 tiny:hidden short:hidden">
                {{ slot.label }}
              </span>
            </template>
          </button>
        </div>

        <div class="flex shrink-0 gap-1.5">
          <button
            v-for="i in 3"
            :key="i"
            type="button"
            class="flex-1 rounded-lg py-1.5 text-xs font-semibold"
            :class="preset === i - 1 ? 'bg-ink/15 text-ink' : 'panel text-ink/60'"
            :aria-pressed="preset === i - 1"
            @click="preset = i - 1"
          >
            Tenue {{ i }}
            <i v-if="isWornPreset(i - 1)" class="accent-icon ri-check-line" aria-label="portée" />
            <span v-if="unsaved(i - 1)" aria-label="non enregistrée">*</span>
          </button>
        </div>
        <!-- Deux gestes distincts : garder la tenue, ou l'habiller. -->
        <div class="flex shrink-0 gap-1.5">
          <AppButton class="flex-1 !py-1.5" :disabled="!unsaved(preset) || saving" @click="save">
            <i class="ri-save-line" aria-hidden="true" /> Enregistrer
          </AppButton>
          <AppButton
            class="flex-1 !py-1.5"
            variant="primary"
            :disabled="wornNow || saving"
            @click="wearNow"
          >
            <i class="ri-t-shirt-line" aria-hidden="true" /> {{ wornNow ? "Portée" : "Porter" }}
          </AppButton>
        </div>
        <p v-if="message" role="status" class="text-center text-xs font-semibold">{{ message }}</p>
      </div>

      <div class="flex min-h-0 flex-1 flex-col gap-1.5">
        <div class="flex shrink-0 gap-1" role="tablist">
          <button
            v-for="tab in FILTERS"
            :key="tab.value"
            type="button"
            role="tab"
            class="flex-1 rounded-lg py-1.5 text-[11px] font-semibold"
            :class="filter === tab.value ? 'bg-cyan-500 text-slate-950' : 'panel text-ink/70'"
            :aria-selected="filter === tab.value"
            @click="filter = tab.value"
          >
            {{ tab.label }}
          </button>
        </div>
        <p v-if="!wardrobe.owned.length" class="shrink-0 text-center text-xs text-ink/60">
          Termine le <RouterLink to="/entrainement" class="text-cyan-400">tutoriel</RouterLink> pour
          gagner un accessoire.
        </p>
        <p v-if="!items.length" class="shrink-0 py-3 text-center text-sm text-ink/50">
          {{
            show === "owned" ? "Rien de débloqué ici pour l'instant." : "Tu as tout débloqué ici !"
          }}
        </p>
        <!-- Des images, pas de noms : le nom ne sert qu'aux lecteurs d'écran. -->
        <ul
          ref="scroller"
          class="grid min-h-0 flex-1 grid-cols-3 content-start gap-1.5 overflow-y-auto lg:grid-cols-4"
          @scroll.passive="onScroll"
        >
          <!-- En tête de la liste d'un emplacement (pas sur « Tout », ni sur ce qui reste à gagner). -->
          <li v-if="filter !== 'all' && show !== 'locked'">
            <button
              type="button"
              data-none
              class="flex aspect-square w-full flex-col items-center justify-center gap-0.5 rounded-xl border-2"
              :class="
                nothingOn ? 'border-cyan-500 bg-surface' : 'panel border-dashed !border-ink/25'
              "
              aria-label="Aucun à cet emplacement"
              :aria-pressed="nothingOn"
              @click="putNothing"
            >
              <i class="ri-forbid-2-line text-3xl text-ink/50" aria-hidden="true" />
              <span class="text-xs font-semibold text-ink/70">Aucun</span>
            </button>
          </li>
          <li v-for="item in visible" :key="item.id">
            <button
              type="button"
              :data-item="item.id"
              class="block aspect-square w-full rounded-xl border-2 p-1"
              :class="
                draft.includes(item.id)
                  ? 'border-cyan-500 bg-surface'
                  : item.owned
                    ? 'panel border-transparent'
                    : 'cursor-default border-transparent bg-surface/40'
              "
              :disabled="!item.owned"
              :aria-label="item.owned ? item.nom : 'Accessoire à gagner'"
              :aria-pressed="draft.includes(item.id)"
              @click="pick(item)"
            >
              <AccessoryThumb :id="item.id" :locked="!item.owned" />
            </button>
          </li>
        </ul>
      </div>
    </div>
    <ModalDialog
      v-if="confirming"
      :title="`Vider la tenue ${preset + 1} ?`"
      @close="confirming = false"
    >
      <p class="text-sm text-ink/70">
        Les accessoires restent à toi. Cette tenue enregistrée sera effacée ; ton canard garde ce
        qu'il porte.
      </p>
      <div class="flex gap-2">
        <AppButton class="flex-1" @click="confirming = false">Annuler</AppButton>
        <AppButton class="flex-1" variant="primary" @click="clearPreset">Vider</AppButton>
      </div>
    </ModalDialog>
    <ModalDialog v-if="leaving" title="Quitter sans enregistrer ?" @close="decideLeaving(false)">
      <p class="text-sm text-ink/70">
        Une de tes tenues a été modifiée sans être enregistrée. Si tu pars maintenant, ces
        changements seront perdus.
      </p>
      <div class="flex gap-2">
        <AppButton class="flex-1" variant="primary" @click="decideLeaving(false)">Rester</AppButton>
        <AppButton class="flex-1" @click="decideLeaving(true)">Quitter sans enregistrer</AppButton>
      </div>
    </ModalDialog>
  </div>
</template>

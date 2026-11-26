<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import AppButton from "../components/atoms/AppButton.vue";
import SegmentedChoice from "../components/atoms/SegmentedChoice.vue";
import { parseLobbyCode } from "../lib/lobbyApi.js";
import { enterLobby, leaveMatch, sendLobby } from "../lib/matchSession.js";
import { useAuthStore } from "../store/authStore.js";
import { useFriendsStore } from "../store/friendsStore.js";
import { useLobbyStore } from "../store/lobbyStore.js";
import type { BotLevel } from "../types.js";

const MODES = [
  { value: "duel", label: "Duel" },
  { value: "ffa4", label: "FFA 4" },
] as const;

const BOT_LEVELS: { value: BotLevel; label: string }[] = [
  { value: "debutant", label: "Débutant" },
  { value: "intermediaire", label: "Intermédiaire" },
  { value: "confirme", label: "Confirmé" },
  { value: "expert", label: "Expert" },
  { value: "impossible", label: "Impossible" },
];

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const friends = useFriendsStore();
const store = useLobbyStore();

const lobby = computed(() => store.lobby);
const typed = ref("");
const copied = ref(false);

const routeCode = computed(() => parseLobbyCode(String(route.params.code ?? "")));

/** Arriver par un lien ou une invitation fait entrer dans ce salon. */
function followRoute() {
  const code = routeCode.value;
  if (code && lobby.value?.code !== code) enterLobby({ code });
}
watch(routeCode, followRoute);
// L'adresse suit le salon créé : c'est elle qu'on partage.
watch(
  () => lobby.value?.code,
  (code) => {
    if (route.name !== "lobby") return;
    if (code && routeCode.value !== code) void router.replace(`/salon/${code}`);
    if (!code && routeCode.value) void router.replace("/salon");
  },
);

onMounted(() => {
  followRoute();
  if (lobby.value && !routeCode.value) void router.replace(`/salon/${lobby.value.code}`);
  void friends.refresh(auth.session?.token);
});

function joinTyped() {
  const code = parseLobbyCode(typed.value);
  if (code) void router.push(`/salon/${code}`);
  else store.notice = "Ce n'est pas un code de salon.";
}

async function copyLink() {
  try {
    await navigator.clipboard.writeText(`${window.location.origin}/salon/${lobby.value!.code}`);
    copied.value = true;
  } catch {
    // Presse-papiers refusé : le code reste lisible à l'écran.
  }
}

function leave() {
  leaveMatch();
  void router.replace("/salon");
}

/** Une ligne par place : les joueurs, puis les bots, puis les places libres. */
const seats = computed(() => {
  const state = lobby.value;
  if (!state) return [];
  return Array.from({ length: state.capacity }, (_, i) => {
    const player = state.players[i];
    if (player) return { key: player.tag, player, bot: false };
    const bot = i < state.players.length + state.bots;
    return { key: `seat-${i}`, player: undefined, bot };
  });
});

const full = computed(
  () => !!lobby.value && lobby.value.players.length + lobby.value.bots === lobby.value.capacity,
);

const invitable = computed(() =>
  friends.friends.filter((f) => !lobby.value?.players.some((p) => p.tag === f.tag)),
);

const addBots = (delta: number) =>
  sendLobby({ type: "LOBBY_SETTINGS", bots: lobby.value!.bots + delta });
</script>

<template>
  <div class="mx-auto flex h-full max-w-md flex-col gap-2 px-3 py-3 short:max-w-3xl short:py-2">
    <p v-if="store.notice" role="status" class="text-sm font-semibold text-amber-400">
      {{ store.notice }}
    </p>

    <!-- Pas encore de salon : en créer un, ou saisir un code. -->
    <template v-if="!lobby">
      <h1 class="text-2xl font-bold">Partie personnalisée</h1>
      <p class="text-sm text-ink/70">
        Joue avec qui tu veux, complète avec des bots. Le classement ne change pas.
      </p>
      <p v-if="routeCode && !store.notice" class="text-sm text-ink/50">Connexion au salon…</p>
      <AppButton variant="primary" @click="enterLobby({ mode: 'duel' })">Créer un salon</AppButton>
      <form class="flex gap-2" @submit.prevent="joinTyped">
        <input
          v-model="typed"
          placeholder="Code ou lien d'un salon"
          aria-label="Code ou lien d'un salon"
          autocomplete="off"
          class="panel min-w-0 flex-1 rounded-lg px-3 py-2 text-sm text-ink outline-none placeholder:text-ink/40"
        />
        <button type="submit" class="rounded-lg bg-ink/10 px-4 py-2 text-sm font-semibold">
          Rejoindre
        </button>
      </form>
    </template>

    <template v-else>
      <div class="flex items-center justify-between gap-2">
        <h1 class="text-xl font-bold">
          Salon <span class="font-mono">{{ lobby.code }}</span>
        </h1>
        <button
          type="button"
          class="panel flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
          @click="copyLink"
        >
          <i :class="copied ? 'ri-check-line' : 'ri-links-line'" aria-hidden="true" />
          {{ copied ? "Copié" : "Copier le lien" }}
        </button>
      </div>

      <div class="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
        <SegmentedChoice
          v-if="store.isHost"
          label="Mode"
          :options="MODES"
          :model-value="lobby.mode"
          @update:model-value="sendLobby({ type: 'LOBBY_SETTINGS', mode: $event })"
        />
        <p v-else class="text-sm text-ink/70">
          Mode : {{ MODES.find((m) => m.value === lobby!.mode)?.label }}
        </p>

        <ul class="flex flex-col gap-1">
          <li
            v-for="(seat, i) in seats"
            :key="seat.key"
            class="panel flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm"
          >
            <template v-if="seat.player">
              <span class="min-w-0 flex-1 truncate font-bold">
                {{ seat.player.username
                }}<span class="font-mono text-xs font-normal text-ink/50"
                  >#{{ seat.player.tag }}</span
                >
              </span>
              <span class="shrink-0 text-xs text-ink/60">
                {{ i === 0 ? "Hôte" : "" }} {{ seat.player.tag === store.you ? "(toi)" : "" }}
              </span>
            </template>
            <template v-else-if="seat.bot">
              <span class="flex-1">Bot {{ lobby.botLabel }}</span>
              <button
                v-if="store.isHost"
                type="button"
                class="px-2 text-xs font-semibold underline"
                @click="addBots(-1)"
              >
                Retirer
              </button>
            </template>
            <template v-else>
              <span class="flex-1 text-ink/40">Place libre</span>
              <button
                v-if="store.isHost"
                type="button"
                class="px-2 text-xs font-semibold underline"
                @click="addBots(1)"
              >
                Ajouter un bot
              </button>
            </template>
          </li>
        </ul>

        <label v-if="store.isHost && lobby.bots" class="flex items-center justify-between text-sm">
          <span class="text-ink/70">Niveau des bots</span>
          <select
            class="rounded-lg border border-ink/15 bg-surface px-2 py-1 text-sm"
            :value="lobby.botLevel"
            @change="
              sendLobby({
                type: 'LOBBY_SETTINGS',
                botLevel: ($event.target as HTMLSelectElement).value as BotLevel,
              })
            "
          >
            <option v-for="level in BOT_LEVELS" :key="level.value" :value="level.value">
              {{ level.label }}
            </option>
          </select>
        </label>

        <template v-if="lobby.players.length < lobby.capacity">
          <h2 class="text-sm font-bold text-ink/70">Inviter des amis</h2>
          <p v-if="!invitable.length" class="text-sm text-ink/50">
            <RouterLink v-if="!friends.friends.length" to="/amis" class="text-cyan-400">
              Ajoute des amis,
            </RouterLink>
            <template v-else>Tes amis sont déjà là :</template>
            envoie le lien du salon pour inviter quelqu'un.
          </p>
          <ul class="flex flex-col gap-1">
            <li
              v-for="friend in invitable"
              :key="friend.tag"
              class="flex items-center gap-2 px-1 text-sm"
            >
              <span class="min-w-0 flex-1 truncate">{{ friend.username }}</span>
              <span v-if="lobby.invited.includes(friend.tag)" class="text-xs text-ink/50">
                Invité
              </span>
              <AppButton v-else @click="sendLobby({ type: 'LOBBY_INVITE', tag: friend.tag })">
                Inviter
              </AppButton>
            </li>
          </ul>
        </template>
      </div>

      <div class="flex shrink-0 gap-2">
        <AppButton @click="leave">Quitter</AppButton>
        <AppButton
          v-if="store.isHost"
          class="flex-1"
          variant="primary"
          :disabled="!full || lobby.playing"
          @click="sendLobby({ type: 'LOBBY_START' })"
        >
          {{ full ? "Lancer la partie" : "Remplis toutes les places" }}
        </AppButton>
        <p v-else class="flex-1 self-center text-center text-sm text-ink/60">
          En attente de l'hôte…
        </p>
      </div>
    </template>
  </div>
</template>

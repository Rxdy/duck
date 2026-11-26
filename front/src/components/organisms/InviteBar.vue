<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { declineInvite, fetchInvites, type LobbyInvite } from "../../lib/lobbyApi.js";
import { useAuthStore } from "../../store/authStore.js";
import { useLobbyStore } from "../../store/lobbyStore.js";

/**
 * Sur toutes les pages : une invitation reçue, ou le chemin du retour vers le
 * salon qu'on a quitté des yeux. Rien pendant qu'on joue.
 */
const POLL_MS = 4000;
const PLAYING = ["game", "test-game", "training", "training-free"];

const auth = useAuthStore();
const lobbies = useLobbyStore();
const route = useRoute();
const router = useRouter();
const invites = ref<LobbyInvite[]>([]);

const hidden = computed(() => PLAYING.includes(String(route.name)));

async function poll() {
  const token = auth.session?.token;
  if (!token) invites.value = [];
  else if (!hidden.value && !document.hidden) invites.value = await fetchInvites(token);
}

const invite = computed(() => invites.value.find((i) => i.code !== lobbies.lobby?.code));
const backTo = computed(() =>
  lobbies.lobby && route.name !== "lobby" ? lobbies.lobby.code : undefined,
);

function accept(code: string) {
  invites.value = [];
  void router.push(`/salon/${code}`);
}

async function refuse(code: string) {
  invites.value = invites.value.filter((i) => i.code !== code);
  await declineInvite(auth.session!.token, code);
}

let timer: ReturnType<typeof setInterval> | undefined;
onMounted(() => {
  void poll();
  timer = setInterval(poll, POLL_MS);
});
onUnmounted(() => clearInterval(timer));
watch(() => auth.session?.token, poll);
</script>

<template>
  <div
    v-if="!hidden && (invite || backTo)"
    role="status"
    class="panel mx-2 mt-2 flex shrink-0 items-center gap-2 rounded-xl !border-cyan-500/60 px-3 py-2"
  >
    <template v-if="invite">
      <p class="min-w-0 flex-1 truncate text-sm">
        <strong>{{ invite.from }}</strong> t'invite
      </p>
      <button
        type="button"
        class="shrink-0 rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-bold text-slate-950"
        @click="accept(invite.code)"
      >
        Rejoindre
      </button>
      <button
        type="button"
        class="shrink-0 rounded-lg bg-ink/10 px-3 py-1.5 text-xs font-semibold"
        @click="refuse(invite.code)"
      >
        Refuser
      </button>
    </template>
    <template v-else>
      <p class="min-w-0 flex-1 truncate text-sm">Tu es dans le salon {{ backTo }}</p>
      <RouterLink
        :to="`/salon/${backTo}`"
        class="shrink-0 rounded-lg bg-ink/10 px-3 py-1.5 text-xs font-semibold"
      >
        Y retourner
      </RouterLink>
    </template>
  </div>
</template>

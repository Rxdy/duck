<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import AppButton from "../components/atoms/AppButton.vue";
import IconButton from "../components/atoms/IconButton.vue";
import FriendRow from "../components/molecules/FriendRow.vue";
import {
  friendAction,
  requestMessage,
  findByCode,
  isPlayerCode,
  type Friend,
  type FriendAction,
} from "../lib/friendsApi.js";
import { useAuthStore } from "../store/authStore.js";
import { useFriendsStore } from "../store/friendsStore.js";

const auth = useAuthStore();
const store = useFriendsStore();
const token = () => auth.session?.token;

const search = ref("");
const results = ref<Friend[]>();
const message = ref("");
const busy = ref(false);
/** Retirer un ami se confirme : le geste ne s'annule pas. */
const confirming = ref<string>();

const searching = computed(() => isPlayerCode(search.value));

const myHandle = computed(() =>
  auth.session?.tag ? `${auth.session.username}#${auth.session.tag}` : "",
);
const copied = ref(false);
async function copyHandle() {
  try {
    await navigator.clipboard.writeText(myHandle.value);
    copied.value = true;
  } catch {
    // Presse-papiers refusé : le code reste lisible à l'écran.
  }
}

/** Où en est-on avec un joueur trouvé par la recherche. */
function relation(tag: string): string | undefined {
  const has = (list: Friend[]) => list.some((f) => f.tag === tag);
  if (has(store.friends)) return "Déjà ami";
  if (has(store.outgoing)) return "Demande envoyée";
  if (has(store.incoming)) return "T'a envoyé une demande";
  return undefined;
}

let debounce: ReturnType<typeof setTimeout> | undefined;
watch(search, (value) => {
  clearTimeout(debounce);
  results.value = undefined;
  message.value = "";
  if (!searching.value) return;
  debounce = setTimeout(async () => {
    const found = await findByCode(token()!, value.trim());
    if (search.value !== value) return; // la saisie a continué entre-temps
    if (found) results.value = found;
    else message.value = "Recherche impossible pour le moment.";
  }, 300);
});

async function act(action: FriendAction, { tag, username }: Friend) {
  if (busy.value) return;
  busy.value = true;
  const answer = await friendAction(token()!, action, tag);
  await store.refresh(token());
  confirming.value = undefined;
  if (!answer || answer.outcome === false) message.value = requestMessage(undefined, username);
  else message.value = action === "add" ? requestMessage(answer.outcome, username) : "";
  busy.value = false;
}

onMounted(() => store.refresh(token()));
</script>

<template>
  <div class="mx-auto flex h-full max-w-md flex-col gap-2 px-3 py-3 short:py-2">
    <div class="flex items-center justify-between gap-2">
      <h1 class="text-2xl font-bold short:text-lg">Amis</h1>
      <!-- Le code à donner à un ami pour qu'il te trouve à coup sûr. -->
      <button
        v-if="myHandle"
        type="button"
        class="panel flex min-w-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs"
        aria-label="Copier mon code joueur"
        @click="copyHandle"
      >
        <span class="truncate font-mono">{{ myHandle }}</span>
        <i :class="copied ? 'ri-check-line' : 'ri-file-copy-line'" aria-hidden="true" />
      </button>
    </div>

    <input
      v-model="search"
      type="search"
      maxlength="27"
      placeholder="Code joueur d'un ami (ex. A3F9C2)"
      aria-label="Chercher un joueur"
      autocomplete="off"
      class="panel w-full shrink-0 rounded-lg px-3 py-2 text-sm text-ink outline-none placeholder:text-ink/40 short:py-1"
    />
    <p v-if="message" role="status" class="text-xs font-semibold">{{ message }}</p>

    <!-- Seules les listes défilent : le titre et la recherche restent en place. -->
    <div class="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
      <template v-if="searching">
        <p v-if="results && results.length === 0" class="text-sm text-ink/50">
          Aucun joueur avec ce code.
        </p>
        <ul class="flex flex-col gap-1.5">
          <FriendRow
            v-for="player in results"
            :key="player.tag"
            v-bind="player"
            :note="relation(player.tag)"
          >
            <AppButton
              v-if="relation(player.tag) === 'T\'a envoyé une demande'"
              variant="primary"
              @click="act('accept', player)"
            >
              Accepter
            </AppButton>
            <AppButton
              v-else-if="!relation(player.tag)"
              variant="primary"
              @click="act('add', player)"
            >
              Ajouter
            </AppButton>
          </FriendRow>
        </ul>
      </template>

      <template v-else>
        <p v-if="store.failed" class="text-sm text-ink/50">Liste indisponible pour le moment.</p>

        <template v-if="store.incoming.length">
          <h2 class="text-sm font-bold text-ink/70">Demandes reçues</h2>
          <ul class="flex flex-col gap-1.5">
            <FriendRow v-for="player in store.incoming" :key="player.tag" v-bind="player">
              <AppButton variant="primary" @click="act('accept', player)"> Accepter </AppButton>
              <IconButton
                icon="ri-close-line"
                :label="`Refuser ${player.username}`"
                @click="act('remove', player)"
              />
            </FriendRow>
          </ul>
        </template>

        <h2 class="text-sm font-bold text-ink/70">Mes amis ({{ store.friends.length }})</h2>
        <p v-if="store.loaded && !store.friends.length" class="text-sm text-ink/50">
          Saisis le code d'un ami pour l'ajouter.
        </p>
        <ul class="flex flex-col gap-1.5">
          <FriendRow v-for="player in store.friends" :key="player.tag" v-bind="player">
            <template v-if="confirming === player.tag">
              <AppButton @click="act('remove', player)">Retirer</AppButton>
              <AppButton @click="confirming = undefined">Garder</AppButton>
            </template>
            <IconButton
              v-else
              icon="ri-user-unfollow-line"
              :label="`Retirer ${player.username} de mes amis`"
              @click="confirming = player.tag"
            />
          </FriendRow>
        </ul>

        <template v-if="store.outgoing.length">
          <h2 class="text-sm font-bold text-ink/70">Demandes envoyées</h2>
          <ul class="flex flex-col gap-1.5">
            <FriendRow v-for="player in store.outgoing" :key="player.tag" v-bind="player">
              <AppButton @click="act('remove', player)">Annuler</AppButton>
            </FriendRow>
          </ul>
        </template>
      </template>
    </div>
  </div>
</template>

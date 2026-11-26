<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import DuckPortrait from "../components/atoms/DuckPortrait.vue";
import { DUCK_GLOW, DUCK_IMAGES } from "../lib/ducks.js";
import { profileSections } from "../lib/profileMenu.js";
import { useAuthStore } from "../store/authStore.js";
import { useFriendsStore } from "../store/friendsStore.js";
import { useWardrobeStore } from "../store/wardrobeStore.js";

/** Le profil : le canard du compte, puis les pages rangées par sections. */
const auth = useAuthStore();
const friends = useFriendsStore();
const wardrobe = useWardrobeStore();
const router = useRouter();

const sections = computed(() => profileSections(auth.isLoggedIn));

function logout() {
  auth.logout();
  void router.push("/");
}
</script>

<template>
  <div
    class="mx-auto flex h-full max-w-md flex-col gap-3 overflow-y-auto px-4 py-3 tiny:gap-1.5 tiny:py-2 short:max-w-3xl short:gap-1.5 short:py-2"
  >
    <div class="flex shrink-0 items-center gap-3">
      <DuckPortrait
        :outfit="wardrobe.outfit"
        class="duck-glow h-24 w-24 tiny:h-14 tiny:w-14 short:h-14 short:w-14"
        :style="{ '--duck-glow': DUCK_GLOW[DUCK_IMAGES.rouge] }"
      />
      <div class="min-w-0">
        <h1 class="truncate text-xl font-bold">{{ auth.session?.username ?? "Invité" }}</h1>
        <p v-if="auth.session?.tag" class="font-mono text-sm text-ink/60">
          #{{ auth.session.tag }}
        </p>
      </div>
    </div>

    <div class="flex flex-col gap-3 tiny:gap-1.5 short:grid short:grid-cols-3 short:gap-2">
      <section v-for="section in sections" :key="section.title">
        <h2 class="mb-1 text-xs font-bold uppercase tracking-wide text-ink/50">
          {{ section.title }}
        </h2>
        <ul class="panel divide-y divide-ink/10 overflow-hidden rounded-xl">
          <li v-for="entry in section.entries" :key="entry.to">
            <RouterLink
              :to="entry.to"
              class="flex items-center gap-3 px-3 py-2.5 active:bg-ink/10 tiny:py-1.5 short:px-2 short:py-1.5"
            >
              <i class="accent-icon text-xl" :class="entry.icon" aria-hidden="true" />
              <span class="min-w-0 flex-1">
                <span class="block text-sm font-bold">{{ entry.label }}</span>
                <span class="block truncate text-xs text-ink/60 tiny:hidden short:hidden">
                  {{ entry.description }}
                </span>
              </span>
              <span
                v-if="entry.to === '/amis' && friends.incoming.length"
                class="rounded-full bg-cyan-500 px-1.5 text-xs font-bold text-slate-950"
                >{{ friends.incoming.length }}</span
              >
              <i class="ri-arrow-right-s-line text-lg text-ink/40" aria-hidden="true" />
            </RouterLink>
          </li>
        </ul>
      </section>
    </div>

    <button
      v-if="auth.isLoggedIn"
      type="button"
      class="panel flex shrink-0 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold tiny:py-1.5 short:py-1.5"
      @click="logout"
    >
      <i class="ri-logout-box-r-line" aria-hidden="true" /> Se déconnecter
    </button>
  </div>
</template>

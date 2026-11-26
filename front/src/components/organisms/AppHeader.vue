<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { useDesktop } from "../../composables/useDesktop.js";
import { profileSections } from "../../lib/profileMenu.js";
import DuckAvatar from "../atoms/DuckAvatar.vue";
import DuckPortrait from "../atoms/DuckPortrait.vue";

/**
 * En-tête : la marque à gauche et UN seul bouton à droite, le canard du compte
 * en entier. Il mène à tout le reste (page du profil, ou menu déroulant sur
 * ordinateur) : le menu principal ne garde que ce qui sert à jouer.
 */
const props = withDefaults(
  defineProps<{ username?: string | null; friendRequests?: number; outfit?: string[] }>(),
  { username: undefined, friendRequests: 0, outfit: () => [] },
);
const emit = defineEmits<{ logout: [] }>();

const open = ref(false);
const root = ref<HTMLElement>();
const route = useRoute();

// Sur ordinateur, un menu déroulant ; ailleurs, le bouton mène à la page du profil.
const isDesktop = useDesktop();
const entries = computed(() =>
  profileSections(!!props.username).flatMap((section) => section.entries),
);
const profileLabel = computed(() =>
  props.friendRequests ? `Profil : ${props.friendRequests} demande(s) d'ami` : "Profil",
);

watch(
  () => route.fullPath,
  () => (open.value = false),
);
const closeOutside = (event: Event) => {
  if (!root.value?.contains(event.target as Node)) open.value = false;
};
const closeOnEscape = (event: KeyboardEvent) => {
  if (event.key === "Escape") open.value = false;
};
onMounted(() => {
  document.addEventListener("pointerdown", closeOutside);
  document.addEventListener("keydown", closeOnEscape);
});
onUnmounted(() => {
  document.removeEventListener("pointerdown", closeOutside);
  document.removeEventListener("keydown", closeOnEscape);
});

function logout() {
  open.value = false;
  emit("logout");
}
</script>

<template>
  <header
    class="relative z-30 flex shrink-0 items-center justify-between border-b border-ink/10 px-4 py-1.5"
    style="padding-top: max(0.375rem, env(safe-area-inset-top))"
  >
    <RouterLink to="/" class="flex items-center gap-2">
      <DuckAvatar />
      <span class="text-lg font-bold tracking-wide">Duck</span>
    </RouterLink>

    <div ref="root" class="relative">
      <component
        :is="isDesktop ? 'button' : RouterLink"
        v-bind="isDesktop ? { type: 'button', 'aria-expanded': open } : { to: '/profil' }"
        data-profile
        class="relative flex h-12 min-w-12 items-center justify-center gap-1.5 rounded-xl border border-ink/10 bg-surface/80 px-0.5 text-ink/80 transition active:scale-95"
        :aria-label="profileLabel"
        @click="isDesktop && (open = !open)"
      >
        <DuckPortrait :outfit="outfit" class="h-11 w-11" />
        <span
          v-if="username"
          class="hidden max-w-24 truncate pr-2 text-sm font-semibold [@media(min-width:400px)]:inline"
          >{{ username }}</span
        >
        <span
          v-if="friendRequests"
          data-badge
          class="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-cyan-500 px-1 text-[10px] font-bold text-slate-950"
          >{{ friendRequests }}</span
        >
      </component>

      <nav
        v-if="open && isDesktop"
        aria-label="Menu du profil"
        class="absolute right-0 top-full mt-1.5 flex w-52 flex-col overflow-hidden rounded-xl border border-ink/15 bg-surface py-1 shadow-2xl"
      >
        <p v-if="username" class="truncate px-3 py-1.5 text-sm font-bold">{{ username }}</p>
        <RouterLink
          v-for="entry in entries"
          :key="entry.to"
          :to="entry.to"
          class="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-ink/10"
          @click="open = false"
        >
          <i class="accent-icon text-lg" :class="entry.icon" aria-hidden="true" />
          <span class="flex-1">{{ entry.label }}</span>
          <span
            v-if="entry.to === '/amis' && friendRequests"
            class="rounded-full bg-cyan-500 px-1.5 text-xs font-bold text-slate-950"
            >{{ friendRequests }}</span
          >
        </RouterLink>
        <!-- Séparée du reste : on ne se déconnecte pas par mégarde. -->
        <button
          v-if="username"
          type="button"
          class="flex items-center gap-2.5 border-t border-ink/10 px-3 py-2 text-left text-sm hover:bg-ink/10"
          @click="logout"
        >
          <i class="ri-logout-box-r-line text-lg" aria-hidden="true" />
          Se déconnecter
        </button>
      </nav>
    </div>
  </header>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { fetchGoogleClientId } from "../../lib/authApi.js";
import { loadGoogleIdentity } from "../../lib/googleIdentity.js";
import { useAuthStore } from "../../store/authStore.js";

/** Bouton « Continuer avec Google » : sert autant à s'inscrire qu'à se connecter. */
const auth = useAuthStore();
const router = useRouter();
const available = ref(false);
const target = ref<HTMLElement | null>(null);
const error = ref<string>();

async function handle({ credential }: { credential: string }) {
  error.value = await auth.loginWithGoogle(credential);
  if (!error.value) await router.push("/");
}

onMounted(async () => {
  const clientId = await fetchGoogleClientId();
  if (!clientId) return;
  try {
    const google = await loadGoogleIdentity();
    available.value = true;
    await nextTick();
    if (!target.value) return;
    google.initialize({ client_id: clientId, callback: (r) => void handle(r) });
    google.renderButton(target.value, {
      theme: "filled_black",
      size: "large",
      text: "continue_with",
      locale: "fr",
      width: Math.min(400, target.value.clientWidth),
    });
  } catch {
    available.value = false;
  }
});
</script>

<template>
  <div v-if="available" class="flex flex-col gap-3">
    <div class="flex items-center gap-3 text-xs text-ink/40">
      <span class="h-px flex-1 bg-ink/10" />
      ou
      <span class="h-px flex-1 bg-ink/10" />
    </div>
    <div ref="target" class="flex min-h-10 justify-center" />
    <p v-if="error" role="alert" class="text-center text-xs text-rose-400">{{ error }}</p>
  </div>
</template>

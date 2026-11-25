<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../store/authStore.js";

const router = useRouter();
const auth = useAuthStore();

const identifier = ref("");
const password = ref("");
const error = ref<string | null>(null);
const submitting = ref(false);

async function handleSubmit() {
  error.value = null;
  submitting.value = true;
  const failure = await auth.login(identifier.value, password.value);
  submitting.value = false;

  if (failure) {
    error.value = failure;
    return;
  }
  router.push("/");
}
</script>

<template>
  <div class="mx-auto flex h-full max-w-sm flex-col justify-center gap-4 px-4 py-6">
    <h1 class="text-2xl font-bold">Se connecter</h1>

    <form class="flex flex-col gap-3" @submit.prevent="handleSubmit">
      <input
        v-model="identifier"
        type="text"
        required
        placeholder="Email ou pseudo"
        autocomplete="username"
        class="rounded-lg border border-ink/10 bg-ink/10 px-3 py-2 text-sm text-ink placeholder:text-ink/40"
      />
      <input
        v-model="password"
        type="password"
        required
        placeholder="Mot de passe"
        autocomplete="current-password"
        class="rounded-lg border border-ink/10 bg-ink/10 px-3 py-2 text-sm text-ink placeholder:text-ink/40"
      />

      <p v-if="error" class="text-center text-xs text-amber-400">{{ error }}</p>

      <button
        type="submit"
        :disabled="submitting"
        class="rounded-lg px-4 py-2 text-sm font-semibold transition active:scale-95"
        :class="submitting ? 'bg-ink/10 text-ink/40' : 'bg-cyan-500 text-slate-950'"
      >
        {{ submitting ? "Connexion..." : "Se connecter" }}
      </button>
    </form>

    <p class="text-center text-sm text-ink/50">
      Pas de compte ?
      <RouterLink to="/inscription" class="text-cyan-400">S'inscrire</RouterLink>
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../store/authStore.js";

const router = useRouter();
const auth = useAuthStore();

const username = ref("");
const email = ref("");
const password = ref("");
const confirmPassword = ref("");
const error = ref<string | null>(null);
const submitting = ref(false);

async function handleSubmit() {
  error.value = null;

  if (password.value !== confirmPassword.value) {
    error.value = "Les mots de passe ne correspondent pas.";
    return;
  }

  submitting.value = true;
  const failure = await auth.register(username.value, email.value, password.value);
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
    <h1 class="text-2xl font-bold">S'inscrire</h1>

    <form class="flex flex-col gap-3" @submit.prevent="handleSubmit">
      <input
        v-model="username"
        type="text"
        required
        minlength="3"
        maxlength="20"
        placeholder="Pseudo"
        autocomplete="username"
        class="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40"
      />
      <input
        v-model="email"
        type="email"
        required
        placeholder="Email"
        autocomplete="email"
        class="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40"
      />
      <input
        v-model="password"
        type="password"
        required
        minlength="8"
        placeholder="Mot de passe (8 caractères min.)"
        autocomplete="new-password"
        class="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40"
      />
      <input
        v-model="confirmPassword"
        type="password"
        required
        placeholder="Confirmer le mot de passe"
        autocomplete="new-password"
        class="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40"
      />

      <p v-if="error" class="text-center text-xs text-amber-400">{{ error }}</p>

      <button
        type="submit"
        :disabled="submitting"
        class="rounded-lg px-4 py-2 text-sm font-semibold transition active:scale-95"
        :class="submitting ? 'bg-white/10 text-white/40' : 'bg-cyan-500 text-slate-950'"
      >
        {{ submitting ? "Création..." : "Créer mon compte" }}
      </button>
    </form>

    <p class="text-center text-sm text-white/50">
      Déjà un compte ?
      <RouterLink to="/connexion" class="text-cyan-400">Se connecter</RouterLink>
    </p>
  </div>
</template>

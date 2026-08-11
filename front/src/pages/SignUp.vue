<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import PasswordStrength from "../components/molecules/PasswordStrength.vue";
import { isPasswordAccepted, MIN_LENGTH } from "../lib/passwordStrength.js";
import { useAuthStore } from "../store/authStore.js";

const router = useRouter();
const auth = useAuthStore();

const username = ref("");
const email = ref("");
const password = ref("");
const confirmPassword = ref("");
const error = ref<string | null>(null);
const submitting = ref(false);

/**
 * La jauge n'est affichée qu'ici, à l'inscription : c'est le seul moment où le
 * joueur CHOISIT son mot de passe. À la connexion, elle ne ferait que noter un
 * mot de passe déjà choisi, sans rien lui permettre d'y changer.
 */
const strongEnough = computed(() => isPasswordAccepted(password.value));

async function handleSubmit() {
  error.value = null;

  if (!strongEnough.value) {
    error.value = "Mot de passe trop faible.";
    return;
  }

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
        class="rounded-lg border border-ink/10 bg-ink/10 px-3 py-2 text-sm text-ink placeholder:text-ink/40"
      />
      <input
        v-model="email"
        type="email"
        required
        placeholder="Email"
        autocomplete="email"
        class="rounded-lg border border-ink/10 bg-ink/10 px-3 py-2 text-sm text-ink placeholder:text-ink/40"
      />
      <input
        v-model="password"
        type="password"
        required
        :minlength="MIN_LENGTH"
        :placeholder="`Mot de passe (${MIN_LENGTH} caractères min.)`"
        autocomplete="new-password"
        class="rounded-lg border border-ink/10 bg-ink/10 px-3 py-2 text-sm text-ink placeholder:text-ink/40"
      />
      <PasswordStrength :password="password" />
      <input
        v-model="confirmPassword"
        type="password"
        required
        placeholder="Confirmer le mot de passe"
        autocomplete="new-password"
        class="rounded-lg border border-ink/10 bg-ink/10 px-3 py-2 text-sm text-ink placeholder:text-ink/40"
      />

      <p v-if="error" class="text-center text-xs text-amber-400">{{ error }}</p>

      <button
        type="submit"
        :disabled="submitting || !strongEnough"
        class="rounded-lg px-4 py-2 text-sm font-semibold transition active:scale-95"
        :class="
          submitting || !strongEnough ? 'bg-ink/10 text-ink/40' : 'bg-cyan-500 text-slate-950'
        "
      >
        {{ submitting ? "Création..." : "Créer mon compte" }}
      </button>
    </form>

    <p class="text-center text-sm text-ink/50">
      Déjà un compte ?
      <RouterLink to="/connexion" class="text-cyan-400">Se connecter</RouterLink>
    </p>
  </div>
</template>

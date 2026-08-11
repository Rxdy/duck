<script setup lang="ts">
import { computed } from "vue";
import {
  meetsRequirements,
  passwordEntropy,
  requirementsOf,
  strengthOf,
  strengthRatio,
} from "../../lib/passwordStrength.js";

/**
 * Jauge de robustesse affichée SOUS le champ mot de passe de l'inscription.
 *
 * Une barre continue plutôt que des segments : elle avance à chaque caractère
 * tapé, donc on voit que rallonger paie même quand on ne change pas de palier.
 * Elle change de couleur en franchissant un palier — c'est ce saut de couleur
 * qui signale qu'on vient de gagner un cran.
 *
 * Le socle obligatoire est listé à part : la barre note, la liste dit ce qui
 * BLOQUE. Confondre les deux laisserait un joueur devant un bouton grisé sans
 * savoir quoi corriger.
 */
const props = defineProps<{ password: string }>();

const bits = computed(() => passwordEntropy(props.password));
const level = computed(() => strengthOf(props.password));
const ratio = computed(() => strengthRatio(props.password));
const requirements = computed(() => requirementsOf(props.password));
const complete = computed(() => meetsRequirements(props.password));
</script>

<template>
  <div v-if="password" class="flex flex-col gap-1.5">
    <div
      class="h-2 overflow-hidden rounded-full bg-ink/10"
      role="progressbar"
      :aria-valuenow="ratio"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-valuetext="`${level.label}, ${bits} bits d'entropie`"
      aria-label="Robustesse du mot de passe"
    >
      <div
        class="h-full rounded-full transition-all duration-300"
        :class="level.color"
        :style="{ width: `${ratio}%` }"
      />
    </div>

    <div class="flex items-baseline justify-between gap-2 text-xs">
      <!-- Annoncé aux lecteurs d'écran : sans ça, la couleur de la barre est
           la seule information, et elle ne leur parvient pas. -->
      <span class="font-semibold text-ink/80" aria-live="polite">{{ level.label }}</span>
      <span class="text-ink/40">{{ bits }} bits</span>
    </div>

    <ul v-if="!complete" class="flex flex-wrap gap-x-3 gap-y-1 text-xs">
      <li
        v-for="requirement in requirements"
        :key="requirement.key"
        class="flex items-center gap-1"
        :class="requirement.met ? 'text-emerald-400' : 'text-ink/40'"
      >
        <i
          :class="requirement.met ? 'ri-check-line' : 'ri-close-line'"
          aria-hidden="true"
          class="text-sm"
        />
        <span>{{ requirement.label }}</span>
      </li>
    </ul>
  </div>
</template>

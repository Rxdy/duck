<script setup lang="ts">
import { computed, ref } from "vue";
import MatchCard from "../molecules/MatchCard.vue";
import { DEFAULT_VISIBLE_MATCHES, type MatchRecap } from "../../lib/matchHistory.js";

/**
 * Récapitulatif des parties, dans son espace dédié.
 *
 * Trois parties visibles au départ : assez pour reconnaître ses dernières
 * sessions, assez peu pour que les statistiques restent à l'écran. Tout
 * dérouler d'un coup pousserait le reste de la page hors de vue, donc la liste
 * complète défile DANS la section plutôt que d'allonger la page.
 */
const props = defineProps<{ matches: MatchRecap[] }>();

const expanded = ref(false);
const visible = computed(() =>
  expanded.value ? props.matches : props.matches.slice(0, DEFAULT_VISIBLE_MATCHES),
);
const hidden = computed(() => Math.max(0, props.matches.length - DEFAULT_VISIBLE_MATCHES));
</script>

<template>
  <section class="flex flex-col gap-3 rounded-xl bg-surface p-4">
    <h2 class="text-sm font-semibold text-ink/70">Mes parties</h2>

    <p v-if="matches.length === 0" class="text-sm text-ink/50">
      Aucune partie pour l'instant. Lance-toi, elles s'afficheront ici.
    </p>

    <template v-else>
      <!-- Hauteur bornée UNIQUEMENT une fois déroulé : sans ça, trois cartes
           flotteraient dans une zone à moitié vide. Le plafond laisse voir
           plus de trois cartes — dérouler doit montrer DAVANTAGE que l'état
           replié — et coupe la suivante, ce qui signale qu'on peut défiler. -->
      <div
        class="flex flex-col gap-2"
        :class="expanded ? 'max-h-[26rem] overflow-y-auto pr-1' : ''"
        :aria-label="expanded ? 'Toutes mes parties' : undefined"
      >
        <MatchCard v-for="match in visible" :key="match.id" :match="match" />
      </div>

      <button
        v-if="hidden > 0"
        type="button"
        class="self-start text-sm font-semibold text-cyan-400"
        :aria-expanded="expanded"
        @click="expanded = !expanded"
      >
        {{ expanded ? "Réduire" : `Voir toutes les parties (${matches.length})` }}
      </button>
    </template>
  </section>
</template>

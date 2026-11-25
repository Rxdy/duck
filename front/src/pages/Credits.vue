<script setup lang="ts">
import { DUCK_GLOW, DUCK_IMAGES } from "../lib/ducks.js";
/**
 * Page Crédits : qui a fait le jeu, avec quoi, et ce qu'on doit à d'autres.
 * La section "Ressources" n'est pas de la politesse — Remix Icon est sous
 * licence Apache 2.0, qui demande de citer sa provenance.
 */
const TECHNOLOGIES = [
  { name: "Vue 3 + Vite", role: "interface et outillage" },
  { name: "TresJS / Three.js", role: "plateau isométrique" },
  { name: "Node.js + ws", role: "serveur de jeu, autoritaire" },
  { name: "PostgreSQL + Drizzle", role: "comptes, parties, cartes" },
  { name: "Tailwind CSS", role: "mise en forme" },
  { name: "Vitest", role: "tests" },
];
</script>

<template>
  <div
    class="mx-auto flex h-full max-w-md flex-col gap-3 overflow-y-auto px-4 py-4 tiny:gap-2 tiny:py-2 short:max-w-4xl short:gap-2 short:py-2 lg:max-w-3xl lg:justify-center"
  >
    <div class="flex flex-col items-center gap-1 text-center">
      <div class="flex justify-center">
        <img
          v-for="duck in Object.values(DUCK_IMAGES)"
          :key="duck"
          :src="duck"
          alt=""
          class="duck-glow h-16 w-16 object-contain tiny:h-9 tiny:w-9 short:hidden lg:h-24 lg:w-24"
          :style="{ '--duck-glow': DUCK_GLOW[duck] }"
        />
      </div>
      <h1 class="text-3xl font-extrabold tiny:text-2xl short:text-xl">Duck</h1>
      <p class="text-sm text-ink/80 tiny:text-xs short:text-xs">
        Un jeu multijoueur sur grille : rejoindre la base adverse pour marquer, sans se faire
        toucher en chemin.
      </p>
    </div>

    <div class="grid grid-cols-1 gap-3 tiny:gap-2 short:grid-cols-2 short:gap-2 lg:grid-cols-2">
      <section class="panel rounded-2xl p-3 tiny:p-2 short:p-2">
        <h2 class="text-xs font-bold uppercase tracking-wider">Conception et développement</h2>
        <p class="text-sm">Rudy</p>
      </section>

      <section class="panel rounded-2xl p-3 tiny:p-2 short:p-2">
        <h2 class="text-xs font-bold uppercase tracking-wider">Inspiration</h2>
        <p class="text-sm text-ink/90 tiny:text-xs short:text-xs">
          Les mini-jeux construits avec les Wired de Habbo Hotel : des règles très simples, et tout
          le sel dans la carte.
        </p>
      </section>

      <section class="panel rounded-2xl p-3 tiny:p-2 short:p-2 short:col-span-1 lg:col-span-2">
        <h2 class="mb-2 text-xs font-bold uppercase tracking-wider">Fabriqué avec</h2>
        <ul
          class="grid grid-cols-2 gap-x-3 gap-y-1.5 tiny:grid-cols-3 tiny:gap-y-1 short:gap-y-0.5 lg:grid-cols-3"
        >
          <li v-for="tech in TECHNOLOGIES" :key="tech.name" class="min-w-0 leading-tight">
            <span class="block text-sm font-semibold tiny:text-xs short:text-xs">{{
              tech.name
            }}</span>
            <span class="block text-xs text-ink/60 tiny:hidden short:hidden">{{ tech.role }}</span>
          </li>
        </ul>
      </section>

      <section class="panel rounded-2xl p-3 tiny:p-2 short:p-2 short:col-span-1 lg:col-span-2">
        <h2 class="text-xs font-bold uppercase tracking-wider">Ressources</h2>
        <p class="text-sm text-ink/90 tiny:text-xs short:text-xs">
          Icônes d'interface : Remix Icon, sous licence Apache 2.0.
        </p>
      </section>
    </div>

    <p class="text-center text-xs text-ink/60 tiny:hidden short:hidden">Merci d'y avoir joué.</p>
  </div>
</template>

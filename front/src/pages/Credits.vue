<script setup lang="ts">
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
  <div class="mx-auto flex h-full max-w-md flex-col gap-6 overflow-y-auto px-4 py-6">
    <div class="flex flex-col items-center gap-3 text-center">
      <img src="/duck-mark.png" alt="" class="h-20 w-20 object-contain" />
      <h1 class="text-2xl font-bold">Duck</h1>
      <p class="text-sm text-ink/60">
        Un jeu multijoueur sur grille : rejoindre la base adverse pour marquer, sans se faire
        toucher en chemin.
      </p>
    </div>

    <section class="flex flex-col gap-1">
      <h2 class="text-xs uppercase tracking-wider text-ink/40">Conception et développement</h2>
      <p class="text-sm text-ink/80">Rudy</p>
    </section>

    <section class="flex flex-col gap-1">
      <h2 class="text-xs uppercase tracking-wider text-ink/40">Inspiration</h2>
      <p class="text-sm text-ink/80">
        Les mini-jeux construits avec les Wired de Habbo Hotel : des règles très simples sur une
        grille, et tout le sel dans la carte.
      </p>
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="text-xs uppercase tracking-wider text-ink/40">Fabriqué avec</h2>
      <ul class="flex flex-col gap-1">
        <li
          v-for="tech in TECHNOLOGIES"
          :key="tech.name"
          class="flex justify-between gap-4 text-sm"
        >
          <span class="text-ink/80">{{ tech.name }}</span>
          <span class="shrink-0 text-ink/40">{{ tech.role }}</span>
        </li>
      </ul>
    </section>

    <section class="flex flex-col gap-1">
      <h2 class="text-xs uppercase tracking-wider text-ink/40">Ressources</h2>
      <p class="text-sm text-ink/80">
        Icônes d'interface : <span class="text-ink/60">Remix Icon</span>, sous licence Apache 2.0.
      </p>
      <p class="text-sm text-ink/80">
        Le canard existe en huit orientations, déclinées automatiquement dans la couleur de chaque
        joueur.
      </p>
    </section>

    <p class="pb-2 text-center text-xs text-ink/30">Merci d'y avoir joué.</p>
  </div>
</template>

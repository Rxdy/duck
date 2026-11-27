/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,vue}"],
  theme: {
    extend: {
      // Écran en paysage et peu haut (téléphone couché).
      screens: {
        // Petit téléphone tenu debout : on resserre pour tout voir d'un coup.
        tiny: { raw: "(orientation: portrait) and (max-height: 700px)" },
        // Grand écran piloté à la souris : les scores peuvent occuper les coins.
        corners: { raw: "(pointer: fine) and (min-width: 768px)" },
        short: { raw: "(orientation: landscape) and (max-height: 560px)" },
        // Écran large ET haut (tablette, grand moniteur) : de la place pour voir grand.
        roomy: { raw: "(min-width: 768px) and (min-height: 900px)" },
      },
      // Couleurs SÉMANTIQUES plutôt que littérales : c'est ce qui permet au
      // thème clair d'exister sans repeindre chaque composant à la main. Les
      // valeurs vivent dans src/style.css, en canaux RVB séparés pour que
      // Tailwind puisse continuer d'y appliquer une opacité (text-ink/60).
      colors: {
        ink: "rgb(var(--ink) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        "surface-deep": "rgb(var(--surface-deep) / <alpha-value>)",
        // Le seul accent de l'interface ; il remplace le cyan de Tailwind.
        cyan: {
          400: "rgb(var(--accent) / <alpha-value>)",
          500: "rgb(var(--accent) / <alpha-value>)",
        },
      },
    },
  },
  plugins: [],
};

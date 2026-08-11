/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,vue}"],
  theme: {
    extend: {
      // Couleurs SÉMANTIQUES plutôt que littérales : c'est ce qui permet au
      // thème clair d'exister sans repeindre chaque composant à la main. Les
      // valeurs vivent dans src/style.css, en canaux RVB séparés pour que
      // Tailwind puisse continuer d'y appliquer une opacité (text-ink/60).
      colors: {
        ink: "rgb(var(--ink) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        "surface-deep": "rgb(var(--surface-deep) / <alpha-value>)",
      },
    },
  },
  plugins: [],
};

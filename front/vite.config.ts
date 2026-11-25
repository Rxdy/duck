/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { templateCompilerOptions } from "@tresjs/core";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["src/**/*.spec.ts"],
  },
  plugins: [
    vue({
      ...templateCompilerOptions,
    }),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon-32.png", "apple-touch-icon.png"],
      manifest: {
        name: "Duck",
        short_name: "Duck",
        description:
          "Jeu multijoueur en ligne sur grille : rejoins la base adverse pour marquer des points.",
        theme_color: "#0b1220",
        background_color: "#0b1220",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        // Toutes générées depuis art/duck/south.png (voir scripts/generate-icons.py).
        // La "maskable" garde une marge bien plus large : le système rogne
        // jusqu'à 20 % de chaque bord pour l'inscrire dans sa propre forme
        // (cercle, carré arrondi, goutte selon le lanceur d'applications).
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
  },
});

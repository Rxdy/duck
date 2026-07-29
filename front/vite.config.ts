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
      includeAssets: ["duck.png"],
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
        icons: [
          { src: "/duck.png", sizes: "192x192", type: "image/png" },
          { src: "/duck.png", sizes: "512x512", type: "image/png" },
          { src: "/duck.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
  },
});

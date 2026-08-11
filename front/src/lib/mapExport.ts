import type { SavedMap } from "./savedMaps.js";

const WS_URL = import.meta.env.VITE_SERVER_WS_URL ?? "ws://localhost:8080";
// "ws://" -> "http://", "wss://" -> "https://" (le préfixe "ws" commun aux
// deux devient "http", laissant le "s" éventuel former "https").
const HTTP_URL = WS_URL.replace(/^ws/, "http");

/**
 * Frontière d'E/S (réseau) — volontairement non testée unitairement, comme
 * lib/settings.ts#loadSettings. Envoie la carte au serveur en plus de la
 * sauvegarde locale (localStorage, inchangée) : elle atterrit dans
 * back/maps/, un point de dépôt pour les reprendre plus tard comme cartes
 * par défaut (voir docs/02-gameplay.md). Best-effort — un serveur hors ligne
 * ne doit jamais faire échouer la sauvegarde locale, qui a déjà réussi.
 */
export async function exportMapToServer(map: SavedMap, category: "duel" | "equipe"): Promise<void> {
  try {
    await fetch(`${HTTP_URL}/maps`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...map, category }),
    });
  } catch {
    // Serveur injoignable : tant pis, ce n'est qu'une copie de secours.
  }
}

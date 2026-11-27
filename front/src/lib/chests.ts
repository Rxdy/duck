import type { ChestRarity } from "../types.js";

/** Ce que le joueur voit d'un coffre (voir back/src/chests.ts, qui en décide). */
export const CHEST_LOOK: Record<ChestRarity, { name: string; color: string; items: number }> = {
  cuivre: { name: "Cuivre", color: "#c97a4a", items: 1 },
  argent: { name: "Argent", color: "#c9d2de", items: 3 },
  or: { name: "Or", color: "#f2c14e", items: 5 },
};

export const CHEST_SLOTS = 4;

/**
 * Temps lisible d'un coup d'œil : « 1 h », « 30 min », « 4:05 ». `clock` : un décompte en cours, qui
 * s'écrit toujours en minutes et secondes (« 5:00 », pas « 5 min »).
 */
export function formatDuration(ms: number, clock = false): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours > 0) return minutes ? `${hours} h ${String(minutes).padStart(2, "0")}` : `${hours} h`;
  if (seconds === 0 && !clock) return `${minutes} min`;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

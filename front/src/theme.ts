/**
 * Palette des couleurs joueurs (jusqu'à 4 joueurs en FFA). Doit rester
 * synchronisée à la main avec PLAYER_COLORS dans back/src/shared.ts —
 * front/ ne partage plus de code avec back/ (voir docs/06-architecture-technique.md).
 */
export const PLAYER_COLORS = ["#FF4D6D", "#00C2D1", "#FFB100", "#9B5DE5"] as const;

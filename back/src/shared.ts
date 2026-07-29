export type PlayerId = string;
export type GameId = string;

export interface Vector2 {
  x: number;
  y: number;
}

/**
 * Palette des couleurs joueurs (jusqu'à 4 joueurs en FFA), assignées dans
 * l'ordre d'arrivée dans la partie. Volontairement différente des palettes
 * par défaut Google/Microsoft (bleu/rouge/jaune/vert).
 */
export const PLAYER_COLORS = ["#FF4D6D", "#00C2D1", "#FFB100", "#9B5DE5"] as const;

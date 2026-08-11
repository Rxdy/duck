import { PLAYER_COLORS } from "../theme.js";

/**
 * Palette Okabe-Ito (sans rouge/vert adjacents), utilisée en mode daltonien à
 * la place de PLAYER_COLORS : ses 4 teintes restent distinguables en
 * deutéranopie/protanopie/tritanopie, contrairement à la palette par défaut
 * (rouge/cyan notamment, difficiles à différencier en deutéranopie).
 */
export const COLORBLIND_PLAYER_COLORS = ["#E69F00", "#56B4E9", "#F0E442", "#D55E00"] as const;

/**
 * Remappe une couleur de joueur reçue du serveur (une des 4 valeurs de
 * PLAYER_COLORS, voir back/src/shared.ts) vers son équivalent daltonien à la
 * même position. Une couleur inconnue est renvoyée telle quelle plutôt que de
 * planter — le rendu reste correct même si les palettes venaient à diverger.
 */
export function resolvePlayerColor(color: string, colorblindMode: boolean): string {
  if (!colorblindMode) return color;
  const index = PLAYER_COLORS.indexOf(color as (typeof PLAYER_COLORS)[number]);
  return index >= 0 ? COLORBLIND_PLAYER_COLORS[index]! : color;
}

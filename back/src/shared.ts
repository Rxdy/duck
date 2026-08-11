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

/**
 * Les trois modes de la V1 (voir docs/02-gameplay.md#modes-de-jeu). La valeur
 * est le nombre de joueurs : les règles sont IDENTIQUES d'un mode à l'autre,
 * seul ce nombre change. Il détermine à lui seul la carte à choisir (autant
 * de bases que de joueurs) et le nombre de bots à ajouter — d'où un simple
 * nombre plutôt qu'une configuration par mode.
 */
export const GAME_MODES = { duel: 2, ffa3: 3, ffa4: 4 } as const;

export type GameMode = keyof typeof GAME_MODES;

/** Mode par défaut quand le client n'en transmet aucun (client plus ancien). */
export const DEFAULT_GAME_MODE: GameMode = "duel";

export function isGameMode(value: unknown): value is GameMode {
  return typeof value === "string" && value in GAME_MODES;
}

export function playerCountFor(mode: GameMode): number {
  return GAME_MODES[mode];
}

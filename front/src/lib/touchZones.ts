import type { Direction } from "../types.js";

/** Point de l'écran en coordonnées relatives (0..1) dans le conteneur du plateau. */
export interface ScreenPoint {
  x: number;
  y: number;
}

export const SCREEN_CENTER: ScreenPoint = { x: 0.5, y: 0.5 };

/**
 * Direction d'un tap selon le côté touché par rapport au CANARD qu'on joue
 * (`anchor`), que la caméra zoomée le tienne au centre ou non. Quatre
 * quadrants plutôt que des bandes : ils s'alignent avec les quatre sens du
 * plateau isométrique, vu en losange.
 */
export function directionForTap(
  relX: number,
  relY: number,
  anchor: ScreenPoint = SCREEN_CENTER,
): Direction {
  const right = relX >= anchor.x;
  if (relY < anchor.y) return right ? "UP" : "LEFT";
  return right ? "RIGHT" : "DOWN";
}

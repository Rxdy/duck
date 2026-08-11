import type { Direction } from "../types.js";

/**
 * Détermine la direction de déplacement à partir d'un tap sur l'écran de jeu,
 * en coordonnées relatives (0..1) dans le conteneur du plateau. On se base sur
 * le quadrant diagonal par rapport au CENTRE de l'écran (haut-droite,
 * bas-droite, bas-gauche, haut-gauche) plutôt que sur des bandes
 * horizontales/verticales : ces 4 quadrants s'alignent avec les 4 arêtes du
 * plateau isométrique (vu en losange à l'écran), ce qui est beaucoup plus
 * instinctif qu'un découpage qui ne correspond à rien visuellement.
 */
export function directionForTap(relX: number, relY: number): Direction {
  const dx = relX - 0.5;
  const dy = relY - 0.5;

  if (dx >= 0 && dy < 0) return "UP";
  if (dx >= 0 && dy >= 0) return "RIGHT";
  if (dx < 0 && dy >= 0) return "DOWN";
  return "LEFT";
}

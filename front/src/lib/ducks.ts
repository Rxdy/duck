/** Rendus du canard par couleur de joueur (voir public/ducks/). */
export const DUCK_IMAGES = {
  rouge: "/ducks/rouge.png",
  cyan: "/ducks/cyan.png",
  jaune: "/ducks/jaune.png",
  vert: "/ducks/vert.png",
} as const;

/** Coincoin, le coach du tutoriel : le canard vert avec ses affaires (atelier des accessoires). */
export const COACH_IMAGE = "/ducks/coach.png";

/** La lueur d'un canard est TOUJOURS de sa propre couleur. */
export const DUCK_GLOW: Record<string, string> = {
  [DUCK_IMAGES.rouge]: "#FF4D6D",
  [DUCK_IMAGES.cyan]: "#00C2D1",
  [DUCK_IMAGES.jaune]: "#FFB100",
  [DUCK_IMAGES.vert]: "#3FC46B",
  [COACH_IMAGE]: "#3FC46B",
};

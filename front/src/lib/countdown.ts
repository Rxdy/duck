/** Durée du décompte de départ, la même que le serveur (back/src/matchmaking.ts). */
export const COUNTDOWN_MS = 3000;

/** Le « Partez ! » reste visible un instant après le départ. */
export const GO_MS = 700;

/** Ce que le décompte affiche, ou `undefined` quand il n'a plus rien à dire. */
export function countdownLabel(remainingMs: number): string | undefined {
  if (remainingMs > 0) return String(Math.ceil(remainingMs / 1000));
  return remainingMs > -GO_MS ? "Partez !" : undefined;
}

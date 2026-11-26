import type { GameMode } from "../types.js";

/** Sans compte : le duel seulement, pas de créatif. Le serveur applique la règle (back/src/access.ts). */
export function isModeAllowed(mode: GameMode, signedIn: boolean): boolean {
  return signedIn || mode === "duel";
}

export function requiresAccount(path: string): boolean {
  return (
    path === "/amis" ||
    path === "/salon" ||
    path.startsWith("/salon/") ||
    path === "/creatif" ||
    path.startsWith("/creatif/")
  );
}

/** La page d'inscription dit pourquoi on y arrive. */
export const LOCKED_REASONS: Record<string, string> = {
  creatif: "Le mode créatif est réservé aux comptes.",
  salon: "Les parties personnalisées sont réservées aux comptes.",
  amis: "Les amis sont réservés aux comptes.",
  ffa4: "Le FFA à 4 joueurs est réservé aux comptes.",
};

export const signUpFor = (reason: string) => `/inscription?raison=${reason}`;

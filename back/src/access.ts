import type { GameMode } from "./shared.js";

/**
 * Ce qu'on peut faire sans compte : le duel. Le reste (autres modes, créatif)
 * demande de s'inscrire. Le front reprend la règle (front/src/lib/access.ts),
 * mais c'est ici qu'elle est appliquée.
 */
const GUEST_MODES: readonly GameMode[] = ["duel"];

export function isAllowed(mode: GameMode, signedIn: boolean): boolean {
  return signedIn || GUEST_MODES.includes(mode);
}

export const ACCOUNT_REQUIRED = "Crée un compte pour débloquer ce mode.";

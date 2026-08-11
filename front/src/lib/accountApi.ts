import type { MatchRecap } from "./matchHistory.js";

const WS_URL = import.meta.env.VITE_SERVER_WS_URL ?? "ws://localhost:8080";
const HTTP_URL = WS_URL.replace(/^ws/, "http");

export interface AccountProfile {
  username: string;
  email: string;
  stats: { played: number; won: number };
}

/** Frontière d'E/S (réseau) — volontairement non testée unitairement. `undefined` si la requête échoue. */
export async function fetchAccountProfile(token: string): Promise<AccountProfile | undefined> {
  try {
    const response = await fetch(`${HTTP_URL}/me`, {
      headers: { authorization: `Bearer ${token}` },
    });
    if (!response.ok) return undefined;
    return (await response.json()) as AccountProfile;
  } catch {
    return undefined;
  }
}

/**
 * Parties du compte, de la plus récente à la plus ancienne (voir
 * back/src/db.ts#listMatchesFor). Frontière d'E/S — non testée unitairement.
 *
 * Liste VIDE en cas d'échec, pas `undefined` : un récapitulatif indisponible
 * se distingue mal d'un compte sans partie, et la page a mieux à faire que
 * d'afficher une erreur pour une section secondaire.
 */
export async function fetchMatchHistory(token: string): Promise<MatchRecap[]> {
  try {
    const response = await fetch(`${HTTP_URL}/me/matches`, {
      headers: { authorization: `Bearer ${token}` },
    });
    if (!response.ok) return [];
    return (await response.json()) as MatchRecap[];
  } catch {
    return [];
  }
}

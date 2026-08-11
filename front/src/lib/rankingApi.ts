const WS_URL = import.meta.env.VITE_SERVER_WS_URL ?? "ws://localhost:8080";
const HTTP_URL = WS_URL.replace(/^ws/, "http");

/**
 * Une ligne du classement (voir back/src/rating.ts). `rank` est le rang
 * GÉNÉRAL, pas la position dans la liste renvoyée.
 */
export interface RankedPlayer {
  rank: number;
  username: string;
  rating: number;
}

export interface Ranking {
  top: RankedPlayer[];
  /**
   * Le joueur connecté, uniquement s'il n'est PAS dans le top renvoyé : on
   * l'affiche alors à part, avec son vrai rang. Un classement où l'on ne se
   * trouve pas ne sert à rien.
   */
  viewer?: RankedPlayer;
}

/** Frontière d'E/S (réseau) — volontairement non testée unitairement. */
export async function fetchRanking(search?: string, me?: string): Promise<Ranking> {
  try {
    const params = new URLSearchParams();
    if (search?.trim()) params.set("search", search.trim());
    if (me) params.set("me", me);
    const query = params.toString() ? `?${params.toString()}` : "";

    const response = await fetch(`${HTTP_URL}/leaderboard${query}`);
    if (!response.ok) return { top: [] };
    return (await response.json()) as Ranking;
  } catch {
    return { top: [] };
  }
}

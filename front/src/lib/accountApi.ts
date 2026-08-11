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

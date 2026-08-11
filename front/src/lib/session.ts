export interface Session {
  token: string;
  username: string;
  email: string;
}

/**
 * Valide des données brutes (JSON lu depuis localStorage, potentiellement
 * corrompues ou d'un ancien format) avant de les traiter comme une session
 * valide — fonction pure, testable sans toucher au stockage.
 */
export function parseSession(raw: unknown): Session | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const r = raw as Record<string, unknown>;
  if (
    typeof r.token !== "string" ||
    typeof r.username !== "string" ||
    typeof r.email !== "string"
  ) {
    return undefined;
  }
  return { token: r.token, username: r.username, email: r.email };
}

const STORAGE_KEY = "duck:session";

/** Frontière d'E/S (localStorage) — volontairement non testée unitairement. */
export function loadSession(): Session | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? parseSession(JSON.parse(raw)) : undefined;
  } catch {
    return undefined;
  }
}

export function persistSession(session: Session): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Stockage plein ou indisponible : on ignore, ce n'est pas critique.
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Stockage indisponible : rien à faire de plus.
  }
}

import { HTTP_URL } from "./serverUrl.js";

export interface Wardrobe {
  owned: string[];
  outfit: string[];
  /** Les trois tenues enregistrées. */
  presets: string[][];
  /** Nombre d'accessoires à gagner au catalogue. */
  total: number;
}

async function call<T>(token: string, path: string, body?: unknown): Promise<T | undefined> {
  try {
    const response = await fetch(`${HTTP_URL}${path}`, {
      method: body ? "POST" : "GET",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: body ? JSON.stringify(body) : undefined,
    });
    return response.ok ? ((await response.json()) as T) : undefined;
  } catch {
    return undefined;
  }
}

/** Frontière d'E/S (réseau) — volontairement non testée unitairement. `undefined` : échec. */
export const fetchWardrobe = (token: string) => call<Wardrobe>(token, "/me/wardrobe");

/** Porte cette tenue, sans toucher aux tenues enregistrées. */
export const wearOutfit = async (token: string, outfit: string[]) =>
  (await call(token, "/me/outfit", { outfit })) !== undefined;

/** Enregistre la tenue numéro `preset`, sans changer ce que porte le canard. */
export const savePreset = async (token: string, preset: number, outfit: string[]) =>
  (await call(token, "/me/presets", { preset, outfit })) !== undefined;

/** Réclame le cadeau de fin de tutoriel : l'accessoire gagné, ou rien s'il a déjà été reçu. */
export const claimTutorialGift = async (token: string) =>
  (await call<{ item: string | null }>(token, "/me/gifts/tutorial", {}))?.item ?? undefined;

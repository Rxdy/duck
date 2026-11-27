import type { ChestRarity } from "../types.js";
import { HTTP_URL } from "./serverUrl.js";

/** Un coffre dans une des 4 places (voir back/src/chests.ts#Chest). */
export interface Chest {
  id: string;
  rarity: ChestRarity;
  state: "waiting" | "unlocking" | "ready";
  unlockMs: number;
  remainingMs: number;
}

async function call(token: string, path: string, method = "GET"): Promise<Response | undefined> {
  try {
    return await fetch(`${HTTP_URL}${path}`, {
      method,
      headers: { authorization: `Bearer ${token}` },
    });
  } catch {
    return undefined;
  }
}

/** Frontière d'E/S (réseau) — volontairement non testée unitairement. `undefined` hors ligne. */
export async function fetchChests(token: string): Promise<Chest[] | undefined> {
  const response = await call(token, "/me/chests");
  if (!response?.ok) return undefined;
  return ((await response.json()) as { chests: Chest[] }).chests;
}

/** Lance l'ouverture. « busy » : une autre est déjà en cours. */
export async function unlockChest(
  token: string,
  id: string,
): Promise<{ ok: true; chest: Chest } | { ok: false; reason: string }> {
  const response = await call(token, `/me/chests/${id}/unlock`, "POST");
  if (!response) return { ok: false, reason: "offline" };
  return (await response.json()) as { ok: true; chest: Chest } | { ok: false; reason: string };
}

/** Ouvre un coffre prêt : les accessoires gagnés. */
export async function openChest(
  token: string,
  id: string,
): Promise<{ ok: true; items: string[] } | { ok: false; reason: string }> {
  const response = await call(token, `/me/chests/${id}/open`, "POST");
  if (!response) return { ok: false, reason: "offline" };
  return (await response.json()) as { ok: true; items: string[] } | { ok: false; reason: string };
}

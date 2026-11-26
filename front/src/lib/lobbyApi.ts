import type { GameMode } from "../types.js";
import { HTTP_URL } from "./serverUrl.js";

export interface LobbyInvite {
  code: string;
  mode: GameMode;
  from: string;
}

/** Frontière d'E/S (réseau) — volontairement non testée unitairement. */
export async function fetchInvites(token: string): Promise<LobbyInvite[]> {
  try {
    const response = await fetch(`${HTTP_URL}/me/invites`, {
      headers: { authorization: `Bearer ${token}` },
    });
    if (!response.ok) return [];
    return ((await response.json()) as { invites: LobbyInvite[] }).invites;
  } catch {
    return [];
  }
}

export async function declineInvite(token: string, code: string): Promise<void> {
  try {
    await fetch(`${HTTP_URL}/me/invites/decline`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ code }),
    });
  } catch {
    // Hors ligne : l'invitation s'éteindra avec le salon.
  }
}

/** Le code d'un salon, saisi tel quel ou collé avec son lien. */
export function parseLobbyCode(text: string): string | undefined {
  return /(?:^|\/salon\/)#?([0-9a-f]{6})\/?$/i.exec(text.trim())?.[1]?.toUpperCase();
}

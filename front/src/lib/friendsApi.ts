import { HTTP_URL } from "./serverUrl.js";

export interface Friend {
  username: string;
  tag: string;
  rating: number;
}

export interface FriendLists {
  friends: Friend[];
  incoming: Friend[];
  outgoing: Friend[];
}

export type FriendAction = "add" | "accept" | "remove";

const PATHS: Record<FriendAction, string> = {
  add: "/me/friends",
  accept: "/me/friends/accept",
  remove: "/me/friends/remove",
};

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
export const fetchFriends = (token: string) => call<FriendLists>(token, "/me/friends");

export const findByCode = async (token: string, code: string) =>
  (await call<{ players: Friend[] }>(token, `/me/players?code=${encodeURIComponent(code)}`))
    ?.players;

export const friendAction = (token: string, action: FriendAction, tag: string) =>
  call<{ outcome: string | boolean }>(token, PATHS[action], { tag });

/** « A3F9C2 », « #A3F9C2 » ou « Léa#A3F9C2 » : de quoi lancer la recherche. */
export const isPlayerCode = (term: string) => /^([^#]*#)?[0-9a-f]{6}$/i.test(term.trim());

/** Ce qu'on dit au joueur après une demande. */
export function requestMessage(outcome: string | boolean | undefined, username: string): string {
  if (outcome === "sent") return `Demande envoyée à ${username}.`;
  if (outcome === "accepted") return `Tu es maintenant ami avec ${username}.`;
  if (outcome === "already") return `Déjà ami ou demandé : ${username}.`;
  if (outcome === "too_many") return "Trop de demandes en attente : annules-en d'abord.";
  return "Ça n'a pas marché. Réessaie.";
}

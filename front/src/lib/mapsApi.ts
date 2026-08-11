import type { EditorMap, TileKind } from "./mapEditor.js";

const WS_URL = import.meta.env.VITE_SERVER_WS_URL ?? "ws://localhost:8080";
const HTTP_URL = WS_URL.replace(/^ws/, "http");

/**
 * Cartes du joueur, stockées côté serveur (voir back/src/maps.ts) : la base
 * fait foi. Le navigateur ne garde plus que le travail en cours dans
 * l'éditeur — une carte sauvegardée doit survivre à un vidage de cache et se
 * retrouver depuis n'importe quel appareil, ce que le localStorage ne
 * permettait pas.
 *
 * Sauvegarder demande donc un compte : sans propriétaire, une carte ne peut
 * être ni retrouvée, ni protégée d'un autre joueur.
 */
export interface SavedMap {
  id: string;
  name: string;
  width: number;
  height: number;
  tiles: TileKind[][];
  spawnCount: number;
  updatedAt: string;
}

/** Frontière d'E/S (réseau) — volontairement non testée unitairement. */
export async function fetchMyMaps(token: string): Promise<SavedMap[]> {
  try {
    const response = await fetch(`${HTTP_URL}/me/maps`, {
      headers: { authorization: `Bearer ${token}` },
    });
    if (!response.ok) return [];
    const body = (await response.json()) as { maps?: SavedMap[] };
    return body.maps ?? [];
  } catch {
    return [];
  }
}

/**
 * Crée la carte, ou écrase celle d'`id` si elle appartient au compte.
 * `undefined` en cas d'échec (hors ligne, carte refusée) — l'appelant doit le
 * dire au joueur plutôt que de laisser croire à une sauvegarde réussie.
 */
export async function saveMyMap(
  token: string,
  input: { id?: string; name: string; map: EditorMap },
): Promise<SavedMap | undefined> {
  try {
    const response = await fetch(`${HTTP_URL}/me/maps`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({
        id: input.id,
        name: input.name,
        width: input.map.width,
        height: input.map.height,
        tiles: input.map.tiles,
      }),
    });
    if (!response.ok) return undefined;
    return (await response.json()) as SavedMap;
  } catch {
    return undefined;
  }
}

export async function deleteMyMap(token: string, id: string): Promise<boolean> {
  try {
    const response = await fetch(`${HTTP_URL}/me/maps/${id}`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${token}` },
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Carte officielle telle qu'on la montre avant de jouer (voir
 * back/src/officialMaps.ts#listOfficialMaps). `players` est son nombre de
 * bases, c'est-à-dire le mode auquel elle se prête.
 */
export interface OfficialMap {
  name: string;
  width: number;
  height: number;
  tiles: TileKind[][];
  players: number;
}

/** Frontière d'E/S (réseau) — volontairement non testée unitairement. */
export async function fetchOfficialMaps(): Promise<OfficialMap[]> {
  try {
    const response = await fetch(`${HTTP_URL}/maps/official`);
    if (!response.ok) return [];
    const body = (await response.json()) as { maps?: OfficialMap[] };
    return body.maps ?? [];
  } catch {
    // Serveur injoignable : pas d'aperçu, mais la page reste utilisable.
    return [];
  }
}

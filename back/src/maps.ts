import { and, desc, eq } from "drizzle-orm";
import { db } from "./db.js";
import { maps } from "./schema.js";

const SPAWN_KINDS = ["spawn-0", "spawn-1", "spawn-2", "spawn-3"];
const TILE_KINDS = new Set(["wall", "empty", ...SPAWN_KINDS]);

/** Bornes de taille, murs du contour compris (voir front/src/lib/board.ts). */
const MIN_SIZE = 7;
const MAX_SIZE = 32;

export interface PlayerMap {
  id: string;
  name: string;
  width: number;
  height: number;
  tiles: string[][];
  spawnCount: number;
  updatedAt: string;
}

export interface MapInput {
  // Fourni pour écraser une carte existante, absent pour en créer une.
  id?: string;
  name: string;
  width: number;
  height: number;
  tiles: unknown;
}

/**
 * Valide une grille reçue du client : le serveur ne fait jamais confiance au
 * navigateur, même pour une carte que le joueur ne partagera qu'avec
 * lui-même — une grille mal formée en base casserait la partie de tous ceux
 * qui la joueraient plus tard. `undefined` si la grille est inexploitable.
 */
export function parseTiles(raw: unknown, width: number, height: number): string[][] | undefined {
  if (!Number.isInteger(width) || !Number.isInteger(height)) return undefined;
  if (width < MIN_SIZE || height < MIN_SIZE) return undefined;
  if (width > MAX_SIZE || height > MAX_SIZE) return undefined;
  if (!Array.isArray(raw) || raw.length !== height) return undefined;

  const tiles: string[][] = [];
  for (const row of raw) {
    if (!Array.isArray(row) || row.length !== width) return undefined;
    if (!row.every((cell) => typeof cell === "string" && TILE_KINDS.has(cell))) return undefined;
    tiles.push(row as string[]);
  }
  return tiles;
}

/**
 * Nombre de bases posées, compté depuis la grille elle-même : c'est ce nombre
 * qui décide du mode auquel la carte se prête, et le client n'a pas à en être
 * la source. Une même couleur posée deux fois ne compte qu'une fois.
 */
export function countSpawns(tiles: string[][]): number {
  return SPAWN_KINDS.filter((kind) => tiles.some((row) => row.includes(kind))).length;
}

/** Cartes d'un compte, la plus récemment modifiée en premier. */
export async function listMapsForAccount(accountId: string): Promise<PlayerMap[]> {
  const rows = await db
    .select()
    .from(maps)
    .where(and(eq(maps.ownerAccountId, accountId), eq(maps.kind, "player")))
    .orderBy(desc(maps.updatedAt));

  return rows.map(toPlayerMap);
}

/**
 * Crée ou met à jour une carte. Écraser une carte n'est possible que si elle
 * appartient VRAIMENT au compte : sans cette vérification, connaître l'id
 * d'une carte suffirait à réécrire celle de quelqu'un d'autre. `undefined`
 * si la carte est invalide ou n'appartient pas au compte.
 */
export async function saveMapForAccount(
  accountId: string,
  input: MapInput,
): Promise<PlayerMap | undefined> {
  const tiles = parseTiles(input.tiles, input.width, input.height);
  if (!tiles) return undefined;

  const name = input.name.trim().slice(0, 80) || "Carte sans nom";
  const values = {
    name,
    kind: "player",
    ownerAccountId: accountId,
    spawnCount: countSpawns(tiles),
    width: input.width,
    height: input.height,
    tiles,
    updatedAt: new Date(),
  };

  if (input.id) {
    const [updated] = await db
      .update(maps)
      .set(values)
      .where(and(eq(maps.id, input.id), eq(maps.ownerAccountId, accountId)))
      .returning();
    return updated ? toPlayerMap(updated) : undefined;
  }

  const [created] = await db.insert(maps).values(values).returning();
  return created ? toPlayerMap(created) : undefined;
}

/** Vrai si la carte existait et appartenait bien au compte. */
export async function deleteMapForAccount(accountId: string, mapId: string): Promise<boolean> {
  const deleted = await db
    .delete(maps)
    .where(and(eq(maps.id, mapId), eq(maps.ownerAccountId, accountId)))
    .returning({ id: maps.id });
  return deleted.length > 0;
}

function toPlayerMap(row: typeof maps.$inferSelect): PlayerMap {
  return {
    id: row.id,
    name: row.name,
    width: row.width,
    height: row.height,
    tiles: row.tiles as string[][],
    spawnCount: row.spawnCount,
    updatedAt: row.updatedAt.toISOString(),
  };
}

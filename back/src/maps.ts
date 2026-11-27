import { and, desc, eq, ilike, sql } from "drizzle-orm";
import { db } from "./db.js";
import { Tile, type GameMap } from "./game-engine/index.js";
import { auditBalance } from "./mapBalance.js";
import { accounts, maps } from "./schema.js";

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
  /** En galerie : visible et jouable par tous. */
  published: boolean;
}

/** Une carte de la galerie : ce qu'il faut pour la montrer et la jouer, avec son auteur. */
export interface PublicMap {
  id: string;
  name: string;
  author: string;
  width: number;
  height: number;
  tiles: string[][];
  spawnCount: number;
  publishedAt: string;
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
    // Retouchée et devenue déséquilibrée, une carte publiée quitte la galerie.
    const stillPublishable = publicationProblems(tiles).length === 0;
    const [updated] = await db
      .update(maps)
      .set(stillPublishable ? values : { ...values, visibility: "private", publishedAt: null })
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
    published: row.visibility === "public",
  };
}

/** La grille de l'éditeur vue par le moteur, pour en vérifier l'équilibre. */
export function toGameMap(tiles: string[][]): GameMap {
  return {
    width: tiles[0]?.length ?? 0,
    height: tiles.length,
    tiles: tiles.map((row) =>
      row.map((cell) =>
        cell === "wall" ? Tile.Wall : cell.startsWith("spawn-") ? Tile.Spawn : Tile.Empty,
      ),
    ),
  };
}

/**
 * Ce qui empêche de publier une carte : la galerie ne doit montrer que des cartes jouables (2 ou 4
 * bases) et équilibrées (mêmes règles que les cartes officielles, voir mapBalance.ts). Vide = publiable.
 */
export function publicationProblems(tiles: string[][]): string[] {
  const spawns = countSpawns(tiles);
  if (spawns !== 2 && spawns !== 4) return ["il faut 2 ou 4 bases"];
  return auditBalance(toGameMap(tiles)).map((p) => p.reason);
}

export type PublishResult =
  | { ok: true; map: PlayerMap }
  | { ok: false; reason: "not-found" }
  | { ok: false; reason: "unbalanced"; problems: string[] };

/** Publie ou retire de la galerie une carte du compte. */
export async function setMapPublished(
  accountId: string,
  mapId: string,
  published: boolean,
): Promise<PublishResult> {
  const [row] = await db
    .select()
    .from(maps)
    .where(and(eq(maps.id, mapId), eq(maps.ownerAccountId, accountId), eq(maps.kind, "player")));
  if (!row) return { ok: false, reason: "not-found" };
  if (published) {
    const problems = publicationProblems(row.tiles as string[][]);
    if (problems.length) return { ok: false, reason: "unbalanced", problems };
  }
  const [updated] = await db
    .update(maps)
    .set({
      visibility: published ? "public" : "private",
      // Republier ne la remet pas en tête : la date est celle de la première publication.
      publishedAt: published ? (row.publishedAt ?? new Date()) : null,
    })
    .where(eq(maps.id, mapId))
    .returning();
  return { ok: true, map: toPlayerMap(updated!) };
}

export const GALLERY_PAGE_SIZE = 24;

/** Les cartes publiques, les plus récentes d'abord ; `search` filtre sur le nom ou l'auteur. */
export async function listPublicMaps(
  search = "",
  page = 0,
): Promise<{ maps: PublicMap[]; hasMore: boolean }> {
  const term = search.trim().slice(0, 40);
  const pattern = `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const rows = await db
    .select({ map: maps, author: accounts.username })
    .from(maps)
    .innerJoin(accounts, eq(accounts.id, maps.ownerAccountId))
    .where(
      and(
        eq(maps.visibility, "public"),
        eq(maps.kind, "player"),
        term
          ? sql`(${ilike(maps.name, pattern)} or ${ilike(accounts.username, pattern)})`
          : undefined,
      ),
    )
    .orderBy(desc(maps.publishedAt))
    .limit(GALLERY_PAGE_SIZE + 1)
    .offset(Math.max(0, Math.floor(page)) * GALLERY_PAGE_SIZE);
  return {
    hasMore: rows.length > GALLERY_PAGE_SIZE,
    maps: rows.slice(0, GALLERY_PAGE_SIZE).map(({ map, author }) => ({
      id: map.id,
      name: map.name,
      author,
      width: map.width,
      height: map.height,
      tiles: map.tiles as string[][],
      spawnCount: map.spawnCount,
      publishedAt: (map.publishedAt ?? map.updatedAt).toISOString(),
    })),
  };
}

/** Copie une carte de la galerie dans les cartes du compte, privée, pour la jouer ou la retoucher. */
export async function copyPublicMap(
  accountId: string,
  mapId: string,
): Promise<PlayerMap | undefined> {
  const [source] = await db
    .select()
    .from(maps)
    .where(and(eq(maps.id, mapId), eq(maps.visibility, "public"), eq(maps.kind, "player")));
  if (!source) return undefined;
  return saveMapForAccount(accountId, {
    name: `${source.name} (copie)`.slice(0, 80),
    width: source.width,
    height: source.height,
    tiles: source.tiles,
  });
}

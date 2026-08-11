import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { desc, sql } from "drizzle-orm";
import { matches } from "./schema.js";
import type { GameMode } from "./shared.js";

export interface MatchResultPlayer {
  // null si le joueur n'a pas transmis d'id anonyme (ex. le bot). Voir
  // front/src/lib/anonId.ts pour la génération côté client.
  anonId: string | null;
  name: string;
  color: string;
  score: number;
  isWinner: boolean;
}

export interface MatchResult {
  mapName: string;
  players: MatchResultPlayer[];
  /** Voir shared.ts#GAME_MODES. Absent pour une partie d'entraînement. */
  mode?: GameMode;
  /** Durée réelle de la manche, du premier joueur entré au point gagnant. */
  durationMs?: number;
}

// Même valeur par défaut que back/.env.example (cohérent avec PORT plus haut
// dans index.ts) : si la base locale tourne (`docker compose up db`) mais
// que la variable n'est pas exportée, on s'y connecte quand même plutôt que
// d'échouer avec des identifiants par défaut de `pg` qui ne correspondent à
// rien ici. Si la base est réellement injoignable, le pool échouera à la
// première requête, pas à l'import — voir recordMatch, qui avale l'erreur.
const DATABASE_URL = process.env.DATABASE_URL ?? "postgres://duck:duck@localhost:5432/duck";

const pool = new Pool({ connectionString: DATABASE_URL });
export const db = drizzle(pool);

/**
 * Enregistre le résultat d'une partie terminée (voir back/src/room.ts,
 * appelé depuis GameRoom#checkForWinner). Best-effort et non bloquant :
 * l'appelant ne doit jamais attendre cette promesse avant d'annoncer la fin
 * de partie aux joueurs, et une base indisponible ne doit jamais faire
 * planter le serveur de jeu.
 */
export async function recordMatch(result: MatchResult): Promise<void> {
  await db.insert(matches).values({
    mapName: result.mapName,
    players: result.players,
    winnerAnonId: result.players.find((p) => p.isWinner)?.anonId ?? null,
    mode: result.mode ?? null,
    durationMs: result.durationMs ?? null,
  });
}

export interface MatchStats {
  played: number;
  won: number;
}

/**
 * Statistiques d'un joueur anonyme (voir front/src/lib/anonId.ts) : `played`
 * compte les parties où il apparaît dans `players` (JSON), `won` celles où
 * il en est le vainqueur. Utilisé pour la page Compte (voir back/src/index.ts
 * GET /me) via le anon_id lié au compte à l'inscription.
 */
export async function getMatchStats(anonId: string): Promise<MatchStats> {
  const result = await db.execute<{ played: number; won: number }>(sql`
    select
      count(*) filter (
        where exists (
          select 1 from jsonb_array_elements(${matches.players}) player
          where player->>'anonId' = ${anonId}
        )
      )::int as played,
      count(*) filter (where ${matches.winnerAnonId} = ${anonId})::int as won
    from ${matches}
  `);
  const row = result.rows[0];
  return { played: row?.played ?? 0, won: row?.won ?? 0 };
}

export interface MatchRecapPlayer {
  name: string;
  color: string;
  score: number;
  isWinner: boolean;
  /** Le joueur qui consulte, pour le distinguer de ses adversaires. */
  isMe: boolean;
}

export interface MatchRecap {
  id: string;
  mapName: string;
  /** null pour les parties d'avant db/init/09-match-recap.sql. */
  mode: string | null;
  durationMs: number | null;
  playedAt: string;
  players: MatchRecapPlayer[];
}

/**
 * Parties d'un joueur, de la plus récente à la plus ancienne, pour le
 * récapitulatif de la page Compte.
 *
 * Les identifiants anonymes des AUTRES joueurs ne sortent pas d'ici : ils ne
 * servent qu'à reconnaître le consultant (`isMe`), et diffuser l'identifiant
 * d'un adversaire permettrait de le pister d'une partie à l'autre.
 *
 * `limit` borne la requête plutôt que le rendu : un compte à mille parties ne
 * doit pas en télécharger mille pour n'en afficher que trois.
 */
export async function listMatchesFor(anonId: string, limit = 50): Promise<MatchRecap[]> {
  const rows = await db
    .select()
    .from(matches)
    .where(
      sql`exists (
        select 1 from jsonb_array_elements(${matches.players}) player
        where player->>'anonId' = ${anonId}
      )`,
    )
    .orderBy(desc(matches.playedAt))
    .limit(limit);

  return rows.map((row) => {
    const players = row.players as MatchResultPlayer[];
    return {
      id: row.id,
      mapName: row.mapName,
      mode: row.mode,
      durationMs: row.durationMs,
      playedAt: row.playedAt.toISOString(),
      // Trié par score décroissant : un récapitulatif se lit du vainqueur au
      // dernier, pas dans l'ordre où les joueurs se sont connectés.
      players: [...players]
        .sort((a, b) => b.score - a.score)
        .map((player) => ({
          name: player.name,
          color: player.color,
          score: player.score,
          isWinner: player.isWinner,
          isMe: player.anonId === anonId,
        })),
    };
  });
}

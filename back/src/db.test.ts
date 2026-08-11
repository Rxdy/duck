import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { db, getMatchStats, listMatchesFor, recordMatch } from "./db.js";
import { matches } from "./schema.js";

// Test d'intégration contre une vraie base Postgres (voir docker-compose.yml,
// service "db") plutôt qu'un mock : c'est le tout premier code base de
// données du projet, la garantie la plus utile ici est que le schéma
// (db/init/*.sql, appliqué une fois par vitest.global-setup.ts) et les
// requêtes Drizzle (back/src/schema.ts, back/src/db.ts) sont réellement
// compatibles entre eux. Nécessite DATABASE_URL (voir back/.env.example) et
// `docker compose up db`.
const insertedIds: string[] = [];

/**
 * Nom de carte unique à chaque exécution. La table contient aussi de VRAIES
 * parties (celles jouées sur le serveur local, voir back/src/index.ts) : avec
 * un nom fixe comme "#1 map 1v1", le test relisait la partie d'un joueur au
 * lieu de la sienne — assertion en échec, et surtout suppression de cette
 * vraie partie au nettoyage.
 */
function uniqueMapName(label: string): string {
  return `test-${label}-${randomUUID()}`;
}

afterAll(async () => {
  for (const id of insertedIds) {
    await db.delete(matches).where(eq(matches.id, id));
  }
});

describe("recordMatch", () => {
  it("persists a finished match and makes it readable back", async () => {
    const mapName = uniqueMapName("recorded");
    await recordMatch({
      mapName,
      players: [
        { anonId: "anon-alice", name: "Alice", color: "#FF4D6D", score: 5, isWinner: true },
        { anonId: "anon-bob", name: "Bob", color: "#00C2D1", score: 2, isWinner: false },
      ],
    });

    const rows = await db.select().from(matches).where(eq(matches.mapName, mapName));
    const row = rows[rows.length - 1]!;
    insertedIds.push(row.id);

    expect(row.winnerAnonId).toBe("anon-alice");
    expect(row.players).toEqual([
      { anonId: "anon-alice", name: "Alice", color: "#FF4D6D", score: 5, isWinner: true },
      { anonId: "anon-bob", name: "Bob", color: "#00C2D1", score: 2, isWinner: false },
    ]);
    expect(row.playedAt).toBeInstanceOf(Date);
  });

  it("stores null as the winner when no player is marked as winner", async () => {
    const mapName = uniqueMapName("sans-vainqueur");
    await recordMatch({
      mapName,
      players: [{ anonId: null, name: "Bot", color: "#00C2D1", score: 0, isWinner: false }],
    });

    const rows = await db.select().from(matches).where(eq(matches.mapName, mapName));
    const row = rows[rows.length - 1]!;
    insertedIds.push(row.id);

    expect(row.winnerAnonId).toBeNull();
  });
});

describe("getMatchStats", () => {
  it("counts matches played and won by an anonymous id", async () => {
    const anonId = `anon-stats-${randomUUID()}`;
    const wonMapName = uniqueMapName("stats-victoire");
    const lostMapName = uniqueMapName("stats-defaite");

    // Une victoire.
    await recordMatch({
      mapName: wonMapName,
      players: [
        { anonId, name: "Alice", color: "#FF4D6D", score: 5, isWinner: true },
        { anonId: "other", name: "Bot", color: "#00C2D1", score: 1, isWinner: false },
      ],
    });
    // Une défaite (apparaît quand même dans "played").
    await recordMatch({
      mapName: lostMapName,
      players: [
        { anonId, name: "Alice", color: "#FF4D6D", score: 2, isWinner: false },
        { anonId: "other", name: "Bot", color: "#00C2D1", score: 5, isWinner: true },
      ],
    });

    const rows = await db.select().from(matches).where(eq(matches.mapName, wonMapName));
    insertedIds.push(rows[rows.length - 1]!.id);
    const rows2 = await db.select().from(matches).where(eq(matches.mapName, lostMapName));
    insertedIds.push(rows2[rows2.length - 1]!.id);

    expect(await getMatchStats(anonId)).toEqual({ played: 2, won: 1 });
  });

  it("returns zeroes for an anonymous id with no matches", async () => {
    expect(await getMatchStats(`anon-never-played-${randomUUID()}`)).toEqual({ played: 0, won: 0 });
  });
});

describe("listMatchesFor", () => {
  /** Enregistre une partie et retient sa ligne pour le nettoyage. */
  async function record(
    anonId: string,
    label: string,
    extra: Partial<Parameters<typeof recordMatch>[0]> = {},
  ) {
    const mapName = uniqueMapName(label);
    await recordMatch({
      mapName,
      players: [
        { anonId, name: "Alice", color: "#FF4D6D", score: 15, isWinner: true },
        { anonId: "anon-rival", name: "Bob", color: "#00C2D1", score: 9, isWinner: false },
      ],
      ...extra,
    });
    const rows = await db.select().from(matches).where(eq(matches.mapName, mapName));
    insertedIds.push(rows[rows.length - 1]!.id);
    return mapName;
  }

  it("renvoie le mode, la durée et l'heure de chaque partie", async () => {
    const anonId = `anon-recap-${randomUUID()}`;
    const mapName = await record(anonId, "recap", { mode: "ffa3", durationMs: 92_000 });

    const [recap] = await listMatchesFor(anonId);

    expect(recap!.mapName).toBe(mapName);
    expect(recap!.mode).toBe("ffa3");
    expect(recap!.durationMs).toBe(92_000);
    expect(Number.isNaN(Date.parse(recap!.playedAt))).toBe(false);
  });

  it("laisse mode et durée à null pour une partie d'avant leur enregistrement", async () => {
    // Leur inventer une valeur afficherait "Duel, 0 s" sur des parties dont on
    // ne sait rien : une donnée absente doit se dire absente.
    const anonId = `anon-ancien-${randomUUID()}`;
    await record(anonId, "ancien");

    const [recap] = await listMatchesFor(anonId);
    expect(recap!.mode).toBeNull();
    expect(recap!.durationMs).toBeNull();
  });

  it("trie les joueurs par score décroissant et désigne le consultant", async () => {
    const anonId = `anon-ordre-${randomUUID()}`;
    const mapName = uniqueMapName("ordre");
    await recordMatch({
      mapName,
      players: [
        { anonId, name: "Alice", color: "#FF4D6D", score: 4, isWinner: false },
        { anonId: "anon-rival", name: "Bob", color: "#00C2D1", score: 15, isWinner: true },
      ],
    });
    const rows = await db.select().from(matches).where(eq(matches.mapName, mapName));
    insertedIds.push(rows[rows.length - 1]!.id);

    const [recap] = await listMatchesFor(anonId);

    // Un récapitulatif se lit du vainqueur au dernier, pas dans l'ordre de
    // connexion des joueurs.
    expect(recap!.players.map((p) => p.name)).toEqual(["Bob", "Alice"]);
    expect(recap!.players.map((p) => p.isMe)).toEqual([false, true]);
  });

  it("ne divulgue jamais l'identifiant anonyme des adversaires", async () => {
    // Le diffuser permettrait de pister un joueur d'une partie à l'autre.
    const anonId = `anon-fuite-${randomUUID()}`;
    await record(anonId, "fuite");

    const [recap] = await listMatchesFor(anonId);
    for (const player of recap!.players) {
      expect(player).not.toHaveProperty("anonId");
    }
  });

  it("rend les parties de la plus récente à la plus ancienne", async () => {
    const anonId = `anon-chrono-${randomUUID()}`;
    const ancienne = await record(anonId, "chrono-1");
    const recente = await record(anonId, "chrono-2");

    const recaps = await listMatchesFor(anonId);
    expect(recaps.map((r) => r.mapName)).toEqual([recente, ancienne]);
  });

  it("borne la requête plutôt que le rendu", async () => {
    // Un compte à mille parties ne doit pas toutes les télécharger pour en
    // afficher trois.
    const anonId = `anon-limite-${randomUUID()}`;
    await record(anonId, "limite-1");
    await record(anonId, "limite-2");
    await record(anonId, "limite-3");

    expect(await listMatchesFor(anonId, 2)).toHaveLength(2);
  });

  it("renvoie une liste vide pour un joueur sans partie", async () => {
    expect(await listMatchesFor(`anon-jamais-${randomUUID()}`)).toEqual([]);
  });
});

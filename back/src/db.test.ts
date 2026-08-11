import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { db, getMatchStats, recordMatch } from "./db.js";
import { matches } from "./schema.js";

// Test d'intégration contre une vraie base Postgres (voir docker-compose.yml,
// service "db") plutôt qu'un mock : c'est le tout premier code base de
// données du projet, la garantie la plus utile ici est que le schéma
// (db/init/*.sql, appliqué une fois par vitest.global-setup.ts) et les
// requêtes Drizzle (back/src/schema.ts, back/src/db.ts) sont réellement
// compatibles entre eux. Nécessite DATABASE_URL (voir back/.env.example) et
// `docker compose up db`.
const insertedIds: string[] = [];

afterAll(async () => {
  for (const id of insertedIds) {
    await db.delete(matches).where(eq(matches.id, id));
  }
});

describe("recordMatch", () => {
  it("persists a finished match and makes it readable back", async () => {
    await recordMatch({
      mapName: "#1 map 1v1",
      players: [
        { anonId: "anon-alice", name: "Alice", color: "#FF4D6D", score: 5, isWinner: true },
        { anonId: "anon-bob", name: "Bob", color: "#00C2D1", score: 2, isWinner: false },
      ],
    });

    const rows = await db.select().from(matches).where(eq(matches.mapName, "#1 map 1v1"));
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
    await recordMatch({
      mapName: "carte-sans-vainqueur",
      players: [{ anonId: null, name: "Bot", color: "#00C2D1", score: 0, isWinner: false }],
    });

    const rows = await db.select().from(matches).where(eq(matches.mapName, "carte-sans-vainqueur"));
    const row = rows[rows.length - 1]!;
    insertedIds.push(row.id);

    expect(row.winnerAnonId).toBeNull();
  });
});

describe("getMatchStats", () => {
  it("counts matches played and won by an anonymous id", async () => {
    const anonId = `anon-stats-${Date.now()}`;

    // Une victoire.
    await recordMatch({
      mapName: "stats-map-1",
      players: [
        { anonId, name: "Alice", color: "#FF4D6D", score: 5, isWinner: true },
        { anonId: "other", name: "Bot", color: "#00C2D1", score: 1, isWinner: false },
      ],
    });
    // Une défaite (apparaît quand même dans "played").
    await recordMatch({
      mapName: "stats-map-2",
      players: [
        { anonId, name: "Alice", color: "#FF4D6D", score: 2, isWinner: false },
        { anonId: "other", name: "Bot", color: "#00C2D1", score: 5, isWinner: true },
      ],
    });

    const rows = await db.select().from(matches).where(eq(matches.mapName, "stats-map-1"));
    insertedIds.push(rows[rows.length - 1]!.id);
    const rows2 = await db.select().from(matches).where(eq(matches.mapName, "stats-map-2"));
    insertedIds.push(rows2[rows2.length - 1]!.id);

    expect(await getMatchStats(anonId)).toEqual({ played: 2, won: 1 });
  });

  it("returns zeroes for an anonymous id with no matches", async () => {
    expect(await getMatchStats("anon-never-played")).toEqual({ played: 0, won: 0 });
  });
});

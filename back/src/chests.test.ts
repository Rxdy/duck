import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { anonIdForAccount, getAccountIdForToken, registerAccount } from "./auth.js";
import {
  awardChest,
  CHEST_SLOTS,
  DAILY_MATCHES,
  listChests,
  MIN_MOVES,
  openChest,
  RARITIES,
  rarityFor,
  startUnlock,
} from "./chests.js";
import { db } from "./db.js";
import { accountItems, accounts, chests, matches } from "./schema.js";
import { CATALOG } from "./catalog.js";
import { listItems } from "./wardrobe.js";

// Contre une vraie base, comme maps.test.ts : les comptes créés partent à la fin, leurs coffres avec.
const createdAccountIds: string[] = [];
const createdMatchIds: string[] = [];

afterAll(async () => {
  for (const id of createdMatchIds) await db.delete(matches).where(eq(matches.id, id));
  for (const id of createdAccountIds) await db.delete(accounts).where(eq(accounts.id, id));
});

async function freshAccount(): Promise<string> {
  const suffix = randomUUID().slice(0, 8);
  const { token } = await registerAccount(
    `coffre-${suffix}`,
    `coffre-${suffix}@example.test`,
    "Motdepasse123!",
  );
  const accountId = (await getAccountIdForToken(token))!;
  createdAccountIds.push(accountId);
  return accountId;
}

/** Fait comme si l'ouverture avait été lancée il y a longtemps : le coffre est prêt. */
async function makeReady(chestId: string) {
  await db
    .update(chests)
    .set({ unlockStartedAt: new Date(Date.now() - 2 * 60 * 60_000) })
    .where(eq(chests.id, chestId));
}

describe("rarityFor", () => {
  it("donne 75 % de cuivre, 20 % d'argent et 5 % d'or", () => {
    const counts = { cuivre: 0, argent: 0, or: 0 };
    for (let roll = 0; roll < 100; roll++) counts[rarityFor(roll)]++;
    expect(counts).toEqual({ cuivre: 75, argent: 20, or: 5 });
  });
});

describe("awardChest", () => {
  it("donne un coffre au vainqueur qui a vraiment joué", async () => {
    const id = await freshAccount();
    const award = await awardChest(id, MIN_MOVES, 99);
    expect(award).toMatchObject({ outcome: "won", chest: { rarity: "or", state: "waiting" } });
    expect(await listChests(id)).toHaveLength(1);
  });

  it("dit à qui possède déjà tout le catalogue qu'il n'y a plus rien à gagner", async () => {
    const id = await freshAccount();
    await db
      .insert(accountItems)
      .values(CATALOG.map((item) => ({ accountId: id, itemId: item.id, source: "test" })))
      .onConflictDoNothing();
    expect(await awardChest(id, MIN_MOVES)).toEqual({ outcome: "complete" });
    expect(await listChests(id)).toEqual([]);
  });

  it("ne donne rien à qui n'a presque pas joué", async () => {
    const id = await freshAccount();
    expect(await awardChest(id, MIN_MOVES - 1)).toEqual({ outcome: "none" });
  });

  it("ne donne rien quand les 4 places sont prises, et le dit", async () => {
    const id = await freshAccount();
    for (let i = 0; i < CHEST_SLOTS; i++) await awardChest(id, MIN_MOVES, 0);
    expect(await awardChest(id, MIN_MOVES, 0)).toEqual({ outcome: "full" });
    expect(await listChests(id)).toHaveLength(CHEST_SLOTS);
  });

  it("ne donne plus rien au-delà de 15 parties dans la journée", async () => {
    const id = await freshAccount();
    // Comme en partie : rejoindre une salle donne au compte son identifiant anonyme.
    const anonId = await anonIdForAccount(id);
    const rows = await db
      .insert(matches)
      .values(
        Array.from({ length: DAILY_MATCHES + 1 }, () => ({
          mapName: "test",
          players: [{ anonId, name: "x", color: "#fff", score: 0, isWinner: true }],
          winnerAnonId: anonId,
        })),
      )
      .returning({ id: matches.id });
    createdMatchIds.push(...rows.map((r) => r.id));

    expect(await awardChest(id, MIN_MOVES)).toEqual({ outcome: "limit" });
  });
});

describe("ouverture", () => {
  it("une seule à la fois", async () => {
    const id = await freshAccount();
    await awardChest(id, MIN_MOVES, 0);
    await awardChest(id, MIN_MOVES, 0);
    const [first, second] = await listChests(id);

    const started = await startUnlock(id, first!.id);
    expect(started).toMatchObject({ ok: true, chest: { state: "unlocking" } });
    expect(await startUnlock(id, second!.id)).toEqual({ ok: false, reason: "busy" });

    // Une fois le premier prêt, le suivant peut partir.
    await makeReady(first!.id);
    expect(await startUnlock(id, second!.id)).toMatchObject({ ok: true });
  });

  it("refuse d'ouvrir un coffre pas encore prêt, ou celui d'un autre", async () => {
    const id = await freshAccount();
    const other = await freshAccount();
    await awardChest(id, MIN_MOVES, 0);
    const [chest] = await listChests(id);

    expect(await openChest(id, chest!.id)).toEqual({ ok: false, reason: "not-ready" });
    await startUnlock(id, chest!.id);
    expect(await openChest(id, chest!.id)).toEqual({ ok: false, reason: "not-ready" });
    await makeReady(chest!.id);
    expect(await openChest(other, chest!.id)).toEqual({ ok: false, reason: "not-found" });
  });

  it("donne des accessoires qu'on n'avait pas, et libère la place", async () => {
    const id = await freshAccount();
    const before = new Set(await listItems(id));
    await awardChest(id, MIN_MOVES, 80); // argent
    const [chest] = await listChests(id);
    await startUnlock(id, chest!.id);
    await makeReady(chest!.id);

    const opened = await openChest(id, chest!.id);

    expect(opened.ok).toBe(true);
    const items = opened.ok ? opened.items : [];
    expect(items).toHaveLength(RARITIES.argent.items);
    expect(new Set(items).size).toBe(items.length);
    for (const item of items) expect(before.has(item)).toBe(false);
    const sources = await db.select().from(accountItems).where(eq(accountItems.accountId, id));
    expect(sources.filter((row) => row.source === "coffre")).toHaveLength(items.length);
    expect(await listChests(id)).toEqual([]);
    // On ne l'ouvre pas deux fois.
    expect(await openChest(id, chest!.id)).toEqual({ ok: false, reason: "not-found" });
  });
});

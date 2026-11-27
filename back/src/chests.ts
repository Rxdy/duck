/**
 * Les coffres : gagnés en partie publique, ouverts après un temps d'attente, ils donnent des
 * accessoires qu'on n'a pas encore (docs/12-recompenses-accessoires.md). Le serveur décide de tout :
 * la rareté, l'heure à laquelle un coffre est prêt, et ce qu'il contient.
 */
import { randomInt } from "node:crypto";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { db } from "./db.js";
import { accountItems, accounts, chests, matches } from "./schema.js";
import { CATALOG } from "./catalog.js";

export type Rarity = "cuivre" | "argent" | "or";

const MINUTE = 60_000;

/** Chance sur 100, temps d'ouverture et nombre d'accessoires de chaque coffre. */
export const RARITIES: Record<Rarity, { chance: number; unlockMs: number; items: number }> = {
  cuivre: { chance: 75, unlockMs: 5 * MINUTE, items: 1 },
  argent: { chance: 20, unlockMs: 30 * MINUTE, items: 3 },
  or: { chance: 5, unlockMs: 60 * MINUTE, items: 5 },
};

export const CHEST_SLOTS = 4;
/** Seules les premières parties du jour peuvent donner un coffre. */
export const DAILY_MATCHES = 15;
/** En deçà, on n'a presque pas joué : pas de coffre. */
export const MIN_MOVES = 20;

/** `roll` entre 0 et 99 : 0-74 cuivre, 75-94 argent, 95-99 or. */
export function rarityFor(roll: number): Rarity {
  if (roll < RARITIES.cuivre.chance) return "cuivre";
  if (roll < RARITIES.cuivre.chance + RARITIES.argent.chance) return "argent";
  return "or";
}

export type ChestState = "waiting" | "unlocking" | "ready";

export interface Chest {
  id: string;
  rarity: Rarity;
  state: ChestState;
  /** Temps total d'ouverture. */
  unlockMs: number;
  /** Millisecondes restantes pendant l'ouverture (0 quand il est prêt). */
  remainingMs: number;
}

function view(row: typeof chests.$inferSelect, now: number): Chest {
  const rarity = row.rarity as Rarity;
  const { unlockMs } = RARITIES[rarity];
  if (!row.unlockStartedAt)
    return { id: row.id, rarity, state: "waiting", unlockMs, remainingMs: unlockMs };
  const remainingMs = Math.max(0, row.unlockStartedAt.getTime() + unlockMs - now);
  return {
    id: row.id,
    rarity,
    state: remainingMs > 0 ? "unlocking" : "ready",
    unlockMs,
    remainingMs,
  };
}

/** Les places du compte, du plus ancien coffre au plus récent. */
export async function listChests(accountId: string, now = Date.now()): Promise<Chest[]> {
  const rows = await db
    .select()
    .from(chests)
    .where(and(eq(chests.accountId, accountId), isNull(chests.openedAt)))
    .orderBy(asc(chests.wonAt));
  return rows.map((row) => view(row, now));
}

export type AwardOutcome =
  | { outcome: "won"; chest: Chest }
  /** Les 4 places sont prises : la victoire ne donne rien, et on le dit. */
  | { outcome: "full" }
  /** Plus de 15 parties aujourd'hui. */
  | { outcome: "limit" }
  /** Il possède déjà tout le catalogue : on le lui dit, sinon il croit à une panne. */
  | { outcome: "complete" }
  /** Pas assez joué, ou pas un joueur humain : rien à annoncer. */
  | { outcome: "none" };

/**
 * Donne un coffre au vainqueur d'une partie publique, si les règles le permettent. La partie doit être
 * déjà enregistrée (elle compte dans les parties du jour).
 */
export async function awardChest(
  accountId: string,
  moves: number,
  roll: number = randomInt(100),
): Promise<AwardOutcome> {
  if (moves < MIN_MOVES) return { outcome: "none" };
  return db.transaction(async (tx) => {
    const [account] = await tx
      .select({ id: accounts.id, anonId: accounts.anonId, role: accounts.role })
      .from(accounts)
      .where(eq(accounts.id, accountId))
      .for("update");
    if (!account || account.role !== "human") return { outcome: "none" } as const;

    const owned = await tx
      .select({ id: accountItems.itemId })
      .from(accountItems)
      .where(eq(accountItems.accountId, accountId));
    const has = new Set(owned.map((row) => row.id));
    if (CATALOG.every((item) => has.has(item.id))) return { outcome: "complete" } as const;

    if (account.anonId) {
      // Le jour commence à minuit, heure de Paris.
      const [{ count }] = (await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(matches)
        .where(
          sql`${matches.playedAt} >= date_trunc('day', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris'
              and ${matches.players} @> ${JSON.stringify([{ anonId: account.anonId }])}::jsonb`,
        )) as [{ count: number }];
      if (count > DAILY_MATCHES) return { outcome: "limit" } as const;
    }

    const waiting = await tx
      .select({ id: chests.id })
      .from(chests)
      .where(and(eq(chests.accountId, accountId), isNull(chests.openedAt)));
    if (waiting.length >= CHEST_SLOTS) return { outcome: "full" } as const;

    const [row] = await tx
      .insert(chests)
      .values({ accountId, rarity: rarityFor(roll) })
      .returning();
    return { outcome: "won", chest: view(row!, Date.now()) } as const;
  });
}

export type UnlockResult = { ok: true; chest: Chest } | { ok: false; reason: "not-found" | "busy" };

/** Lance l'ouverture d'un coffre. Une seule à la fois : refusé si un autre est en cours. */
export async function startUnlock(accountId: string, chestId: string): Promise<UnlockResult> {
  return db.transaction(async (tx) => {
    await tx
      .select({ id: accounts.id })
      .from(accounts)
      .where(eq(accounts.id, accountId))
      .for("update");
    const now = Date.now();
    const rows = await tx
      .select()
      .from(chests)
      .where(and(eq(chests.accountId, accountId), isNull(chests.openedAt)));
    const target = rows.find((row) => row.id === chestId);
    if (!target) return { ok: false, reason: "not-found" } as const;
    if (target.unlockStartedAt) return { ok: true, chest: view(target, now) } as const;
    if (rows.some((row) => view(row, now).state === "unlocking")) {
      return { ok: false, reason: "busy" } as const;
    }
    const [started] = await tx
      .update(chests)
      .set({ unlockStartedAt: new Date(now) })
      .where(eq(chests.id, chestId))
      .returning();
    return { ok: true, chest: view(started!, now) } as const;
  });
}

export type OpenResult =
  { ok: true; items: string[] } | { ok: false; reason: "not-found" | "not-ready" };

/** Ouvre un coffre prêt : tire ses accessoires parmi ceux qu'on n'a pas, et libère sa place. */
export async function openChest(
  accountId: string,
  chestId: string,
  pick: (max: number) => number = randomInt,
): Promise<OpenResult> {
  return db.transaction(async (tx) => {
    await tx
      .select({ id: accounts.id })
      .from(accounts)
      .where(eq(accounts.id, accountId))
      .for("update");
    const [row] = await tx
      .select()
      .from(chests)
      .where(and(eq(chests.id, chestId), eq(chests.accountId, accountId), isNull(chests.openedAt)));
    if (!row) return { ok: false, reason: "not-found" } as const;
    if (view(row, Date.now()).state !== "ready") return { ok: false, reason: "not-ready" } as const;

    const owned = await tx
      .select({ id: accountItems.itemId })
      .from(accountItems)
      .where(eq(accountItems.accountId, accountId));
    const has = new Set(owned.map((r) => r.id));
    const remaining = CATALOG.filter((item) => !has.has(item.id)).map((item) => item.id);
    const items: string[] = [];
    for (let i = 0; i < RARITIES[row.rarity as Rarity].items && remaining.length; i++) {
      items.push(remaining.splice(pick(remaining.length), 1)[0]!);
    }
    if (items.length) {
      await tx
        .insert(accountItems)
        .values(items.map((itemId) => ({ accountId, itemId, source: "coffre" })));
    }
    await tx.update(chests).set({ openedAt: new Date() }).where(eq(chests.id, chestId));
    return { ok: true, items } as const;
  });
}

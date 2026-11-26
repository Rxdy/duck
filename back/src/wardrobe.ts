/**
 * La garde-robe : ce qu'un compte possède et ce que son canard porte. Le serveur est seul juge des
 * deux — le navigateur ne choisit ni ce qu'il gagne, ni le droit de porter une pièce.
 */
import { randomInt } from "node:crypto";
import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "./db.js";
import { accountItems, accounts } from "./schema.js";
import { CATALOG, randomBotOutfit, SLOT_OF } from "./catalog.js";
import { DEFAULT_BOT_LEVEL, isBotLevel } from "./bots.js";

export { CATALOG };

export type Gift = "signup" | "tutorial";

/** Identifiants possédés, du plus ancien au plus récent. */
export async function listItems(accountId: string): Promise<string[]> {
  const rows = await db
    .select({ id: accountItems.itemId })
    .from(accountItems)
    .where(eq(accountItems.accountId, accountId))
    .orderBy(asc(accountItems.acquiredAt), asc(accountItems.itemId));
  return rows.map((row) => row.id).filter((id) => SLOT_OF.has(id));
}

/**
 * Donne un accessoire au hasard parmi ceux qu'on n'a pas. `undefined` si ce cadeau a déjà été reçu
 * ou s'il ne reste rien à gagner. Le compte est verrouillé : deux demandes simultanées n'en font qu'une.
 */
export async function giveRandomItem(accountId: string, gift: Gift): Promise<string | undefined> {
  return db.transaction(async (tx) => {
    const [account] = await tx
      .select({ id: accounts.id })
      .from(accounts)
      .where(eq(accounts.id, accountId))
      .for("update");
    if (!account) return undefined;

    const owned = await tx.select().from(accountItems).where(eq(accountItems.accountId, accountId));
    if (owned.some((row) => row.source === gift)) return undefined;

    const has = new Set(owned.map((row) => row.itemId));
    const remaining = CATALOG.filter((item) => !has.has(item.id));
    if (remaining.length === 0) return undefined;

    const won = remaining[randomInt(remaining.length)]!.id;
    await tx.insert(accountItems).values({ accountId, itemId: won, source: gift });
    return won;
  });
}

export const PRESET_COUNT = 3;

export interface Wardrobe {
  owned: string[];
  /** Ce que le canard porte. */
  outfit: string[];
  /** Les tenues enregistrées : les garder et les porter sont deux gestes distincts. */
  presets: string[][];
}

/** Une liste lue en base, limitée à ce qui est encore possédé et au catalogue. */
function wearable(value: unknown, owned: ReadonlySet<string>): string[] {
  return Array.isArray(value)
    ? value.filter((id): id is string => typeof id === "string" && owned.has(id))
    : [];
}

/** Tant qu'aucune tenue n'a été enregistrée, la première est celle déjà portée. */
const storedPresets = (presets: unknown, outfit: unknown): unknown[] =>
  Array.isArray(presets) ? presets : [outfit ?? [], [], []];

export async function getWardrobe(accountId: string): Promise<Wardrobe> {
  const owned = await listItems(accountId);
  const has = new Set(owned);
  const [account] = await db.select().from(accounts).where(eq(accounts.id, accountId));
  const stored = storedPresets(account?.outfitPresets, account?.outfit);
  return {
    owned,
    outfit: wearable(account?.outfit, has),
    presets: Array.from({ length: PRESET_COUNT }, (_, i) => wearable(stored[i], has)),
  };
}

export async function getOutfit(accountId: string): Promise<string[]> {
  return (await getWardrobe(accountId)).outfit;
}

/** Que des pièces possédées, une au plus par emplacement. */
async function isOwnedOutfit(accountId: string, outfit: unknown): Promise<boolean> {
  if (!Array.isArray(outfit)) return false;
  const owned = new Set(await listItems(accountId));
  if (!outfit.every((id): id is string => typeof id === "string" && owned.has(id))) return false;
  return new Set(outfit.map((id) => SLOT_OF.get(id))).size === outfit.length;
}

/** Change la tenue ou les tenues enregistrées, compte verrouillé. */
async function updateOutfits(
  accountId: string,
  change: (presets: unknown[]) => { outfit?: unknown; presets?: unknown[] },
): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [account] = await tx
      .select()
      .from(accounts)
      .where(eq(accounts.id, accountId))
      .for("update");
    if (!account) return false;
    // Fixées avant tout changement : porter autre chose ne doit pas réécrire la première tenue.
    const current = [...storedPresets(account.outfitPresets, account.outfit)];
    const { outfit, presets = current } = change(current);
    await tx
      .update(accounts)
      .set({ outfitPresets: presets, ...(outfit === undefined ? {} : { outfit }) })
      .where(eq(accounts.id, accountId));
    return true;
  });
}

/** Porte cette tenue, sans toucher aux tenues enregistrées. `false` si elle n'est pas permise. */
export async function wearOutfit(accountId: string, outfit: unknown): Promise<boolean> {
  if (!(await isOwnedOutfit(accountId, outfit))) return false;
  return updateOutfits(accountId, () => ({ outfit }));
}

/** Enregistre la tenue numéro `preset`, sans changer ce que porte le canard. */
export async function savePreset(
  accountId: string,
  preset: unknown,
  outfit: unknown,
): Promise<boolean> {
  if (typeof preset !== "number" || !Number.isInteger(preset)) return false;
  if (preset < 0 || preset >= PRESET_COUNT) return false;
  if (!(await isOwnedOutfit(accountId, outfit))) return false;
  return updateOutfits(accountId, (presets) => {
    presets[preset] = outfit;
    return { presets };
  });
}

/** Habille les bots qui n'ont pas encore de tenue. Chacun garde ensuite la sienne. */
export async function dressBots(): Promise<number> {
  const bare = await db
    .select({ id: accounts.id, level: accounts.level })
    .from(accounts)
    .where(and(eq(accounts.role, "bot"), isNull(accounts.outfit)));
  for (const bot of bare) {
    const level = isBotLevel(bot.level) ? bot.level : DEFAULT_BOT_LEVEL;
    await db
      .update(accounts)
      .set({ outfit: randomBotOutfit(level) })
      .where(eq(accounts.id, bot.id));
  }
  return bare.length;
}

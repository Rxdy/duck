import { and, eq } from "drizzle-orm";
import { db } from "./db.js";
import { accounts, accountSkins, skins } from "./schema.js";

export interface OwnedSkin {
  id: string;
  name: string;
  accessory: string;
  equipped: boolean;
}

/**
 * Offre tout le catalogue à l'inscription (pas encore de boutique/déblocage,
 * voir db/init/04-skin-accessories.sql) et équipe le premier par défaut, pour
 * qu'un compte tout juste créé ait toujours un skin équipé plutôt qu'aucun.
 */
export async function grantStarterSkins(accountId: string): Promise<void> {
  const catalog = await db.select().from(skins);
  if (catalog.length === 0) return;

  await db
    .insert(accountSkins)
    .values(catalog.map((skin) => ({ accountId, skinId: skin.id })))
    .onConflictDoNothing();

  await db
    .update(accounts)
    .set({ equippedSkinId: catalog[0]!.id })
    .where(eq(accounts.id, accountId));
}

/** Skins possédés par un compte, avec lequel est actuellement équipé. */
export async function listOwnedSkins(accountId: string): Promise<OwnedSkin[]> {
  const [account] = await db.select().from(accounts).where(eq(accounts.id, accountId));
  if (!account) return [];

  const owned = await db
    .select({ id: skins.id, name: skins.name, accessory: skins.accessory })
    .from(accountSkins)
    .innerJoin(skins, eq(accountSkins.skinId, skins.id))
    .where(eq(accountSkins.accountId, accountId));

  return owned.map((skin) => ({ ...skin, equipped: skin.id === account.equippedSkinId }));
}

/**
 * Équipe un skin déjà possédé. `false` si le compte ne le possède pas — un
 * joueur ne peut équiper qu'un seul canard à la fois, et seulement parmi les
 * skins qu'il possède réellement (jamais de confiance dans un id envoyé par
 * le client sans vérifier la possession).
 */
export async function equipSkin(accountId: string, skinId: string): Promise<boolean> {
  const [owned] = await db
    .select()
    .from(accountSkins)
    .where(and(eq(accountSkins.accountId, accountId), eq(accountSkins.skinId, skinId)));
  if (!owned) return false;

  await db.update(accounts).set({ equippedSkinId: skinId }).where(eq(accounts.id, accountId));
  return true;
}

/**
 * Accessoire actuellement équipé par un compte, pour l'afficher sur son
 * canard en partie (voir back/src/room.ts, back/src/index.ts). "none" si le
 * compte n'a pas de session valide, pas de skin équipé, ou n'existe plus.
 */
export async function getEquippedAccessory(accountId: string): Promise<string> {
  const [account] = await db.select().from(accounts).where(eq(accounts.id, accountId));
  if (!account?.equippedSkinId) return "none";

  const [skin] = await db.select().from(skins).where(eq(skins.id, account.equippedSkinId));
  return skin?.accessory ?? "none";
}

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { db } from "./db.js";
import { registerAccount } from "./auth.js";
import { equipSkin, listOwnedSkins } from "./skins.js";
import { accounts, skins } from "./schema.js";

// Schéma appliqué une fois par vitest.global-setup.ts (voir db.test.ts).
const createdEmails: string[] = [];

afterAll(async () => {
  for (const email of createdEmails) {
    await db.delete(accounts).where(eq(accounts.email, email));
  }
});

let counter = 0;
async function createTestAccount() {
  counter += 1;
  const suffix = `${Date.now()}-${counter}`;
  const email = `skin-test-${suffix}@example.com`;
  createdEmails.push(email);
  await registerAccount(`skin-test-${suffix}`, email, "Hunter22!x");
  const [account] = await db.select().from(accounts).where(eq(accounts.email, email));
  return account!;
}

describe("grantStarterSkins (via registerAccount)", () => {
  it("owns the entire starter catalog right after registering", async () => {
    const account = await createTestAccount();
    const catalog = await db.select().from(skins);

    const owned = await listOwnedSkins(account.id);

    expect(owned).toHaveLength(catalog.length);
    expect(owned.filter((s) => s.equipped)).toHaveLength(1);
  });
});

describe("equipSkin", () => {
  it("switches the equipped skin among owned skins", async () => {
    const account = await createTestAccount();
    const owned = await listOwnedSkins(account.id);
    const notEquipped = owned.find((s) => !s.equipped)!;

    expect(await equipSkin(account.id, notEquipped.id)).toBe(true);

    const updated = await listOwnedSkins(account.id);
    expect(updated.find((s) => s.id === notEquipped.id)?.equipped).toBe(true);
    // Un seul skin équipé à la fois.
    expect(updated.filter((s) => s.equipped)).toHaveLength(1);
  });

  it("refuses to equip a skin the account doesn't own", async () => {
    // Un id qui n'existe nulle part, plutôt qu'un skin ajouté au catalogue
    // puis retiré : le catalogue est PARTAGÉ, et grantStarterSkins le lit en
    // entier avant d'insérer les possessions. Un skin qui disparaissait entre
    // ces deux requêtes faisait échouer, au hasard, l'inscription lancée en
    // parallèle par un autre fichier de test (violation de clé étrangère sur
    // account_skins). equipSkin vérifie la POSSESSION : un id inconnu est
    // refusé exactement comme un skin appartenant à quelqu'un d'autre.
    const account = await createTestAccount();

    expect(await equipSkin(account.id, randomUUID())).toBe(false);
  });
});

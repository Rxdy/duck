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
  await registerAccount(`skin-test-${suffix}`, email, "hunter22");
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
    const account = await createTestAccount();
    const [phantomSkin] = await db
      .insert(skins)
      .values({ name: `Phantom-${Date.now()}`, accessory: "monocle" })
      .returning();

    expect(await equipSkin(account.id, phantomSkin!.id)).toBe(false);

    await db.delete(skins).where(eq(skins.id, phantomSkin!.id));
  });
});

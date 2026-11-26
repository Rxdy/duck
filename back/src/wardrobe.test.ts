import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { db } from "./db.js";
import { registerAccount, getAccountIdForToken } from "./auth.js";
import { accountItems, accounts } from "./schema.js";
import {
  CATALOG,
  getOutfit,
  giveRandomItem,
  listItems,
  savePreset,
  getWardrobe,
  wearOutfit,
} from "./wardrobe.js";

// Test d'intégration contre la vraie base (voir auth.test.ts).
const created: string[] = [];
afterAll(async () => {
  for (const id of created) await db.delete(accounts).where(eq(accounts.id, id));
});

async function newcomer(): Promise<string> {
  const name = `w${randomUUID().slice(0, 8)}`;
  const { token } = await registerAccount(name, `${name}@example.com`, "Hunter22!x");
  const id = (await getAccountIdForToken(token))!;
  created.push(id);
  return id;
}

/** Possession posée à la main, pour choisir les pièces du test. */
async function give(accountId: string, ...ids: string[]) {
  await db.delete(accountItems).where(eq(accountItems.accountId, accountId));
  await db
    .insert(accountItems)
    .values(ids.map((itemId) => ({ accountId, itemId, source: "test" })));
}

const slotOf = (id: string) => CATALOG.find((item) => item.id === id)!.emplacement;
const two = (slot: string) => CATALOG.filter((item) => item.emplacement === slot).slice(0, 2);

describe("cadeaux", () => {
  it("offre un seul accessoire à l'inscription, sans rien lui faire porter", async () => {
    const id = await newcomer();

    expect(await listItems(id)).toHaveLength(1);
    expect(await getOutfit(id)).toEqual([]);
  });

  it("en offre un autre, différent, à la fin du tutoriel, une seule fois", async () => {
    const id = await newcomer();

    const won = await giveRandomItem(id, "tutorial");

    expect(CATALOG.map((item) => item.id)).toContain(won);
    expect(new Set(await listItems(id)).size).toBe(2);
    expect(await giveRandomItem(id, "tutorial")).toBeUndefined();
    expect(await giveRandomItem(id, "signup")).toBeUndefined();
    expect(await listItems(id)).toHaveLength(2);
  });

  it("n'en donne qu'un même demandé plusieurs fois en même temps", async () => {
    const id = await newcomer();

    const results = await Promise.all([1, 2, 3, 4].map(() => giveRandomItem(id, "tutorial")));

    expect(results.filter(Boolean)).toHaveLength(1);
  });

  it("ne fait jamais regagner une pièce : il ne reste que la dernière", async () => {
    const id = await newcomer();
    const [last, ...rest] = CATALOG.map((item) => item.id);
    await give(id, ...rest);

    expect(await giveRandomItem(id, "tutorial")).toBe(last);
    expect(await giveRandomItem(id, "signup")).toBeUndefined();
  });
});

describe("tenue", () => {
  it("mélange librement les pièces possédées, une par emplacement", async () => {
    const id = await newcomer();
    const head = two("tete")[0]!.id;
    const back = two("dos")[0]!.id;
    await give(id, head, back);

    expect(await wearOutfit(id, [head, back])).toBe(true);
    expect(await getOutfit(id)).toEqual([head, back]);
    expect(await wearOutfit(id, [])).toBe(true);
    expect(await getOutfit(id)).toEqual([]);
  });

  it("enregistrer ne change pas ce que le canard porte", async () => {
    const id = await newcomer();
    const head = two("tete")[0]!.id;
    const back = two("dos")[0]!.id;
    await give(id, head, back);
    await wearOutfit(id, [head]);

    await savePreset(id, 2, [back]);

    expect(await getWardrobe(id)).toMatchObject({
      outfit: [head],
      presets: [[head], [], [back]].map((p, i) => (i === 0 ? expect.any(Array) : p)),
    });
  });

  it("porter ne réécrit aucune tenue enregistrée", async () => {
    const id = await newcomer();
    const head = two("tete")[0]!.id;
    const back = two("dos")[0]!.id;
    await give(id, head, back);
    await savePreset(id, 0, [head]);

    await wearOutfit(id, [back]);

    expect((await getWardrobe(id)).presets).toEqual([[head], [], []]);
  });

  it("vider la tenue enregistrée laisse le canard habillé", async () => {
    const id = await newcomer();
    const head = two("tete")[0]!.id;
    await give(id, head);
    await savePreset(id, 1, [head]);
    await wearOutfit(id, [head]);

    await savePreset(id, 1, []);

    expect(await getWardrobe(id)).toMatchObject({ outfit: [head], presets: [[], [], []] });
  });

  it("n'a pas de quatrième tenue", async () => {
    const id = await newcomer();

    for (const preset of [3, -1, 1.5, "0"]) expect(await savePreset(id, preset, [])).toBe(false);
  });

  it("refuse une pièce non possédée, deux sur le même emplacement, ou n'importe quoi", async () => {
    const id = await newcomer();
    const [first, second] = two("tete").map((item) => item.id);
    await give(id, first!, second!);

    expect(await wearOutfit(id, [two("dos")[0]!.id])).toBe(false);
    expect(await savePreset(id, 0, [first, second])).toBe(false);
    expect(await wearOutfit(id, "couronne")).toBe(false);
    expect(slotOf(first!)).toBe(slotOf(second!));
  });
});

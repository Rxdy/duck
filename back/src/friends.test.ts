import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { db } from "./db.js";
import { accounts } from "./schema.js";
import {
  friendByCode,
  acceptFriend,
  listFriends,
  removeFriend,
  requestFriend,
  findByCode,
} from "./friends.js";

// Test d'intégration contre la vraie base (voir auth.test.ts).
const created: string[] = [];
afterAll(async () => {
  for (const id of created) await db.delete(accounts).where(eq(accounts.id, id));
});

const prefix = `f${randomUUID().slice(0, 6)}`;
/** Non humain, sans compter parmi les bots que leurs tests dénombrent en parallèle. */
const NOT_HUMAN = "test-robot";

async function player(name: string, role = "human", mail = "") {
  const username = `${prefix}${name}`;
  const [account] = await db
    .insert(accounts)
    .values({ username, email: `${username}${mail}@example.com`, role })
    .returning();
  created.push(account!.id);
  return { id: account!.id, username, tag: account!.tag };
}

describe("amis", () => {
  it("trouve un joueur par son code, jamais par son pseudo, et sans donner l'email", async () => {
    const me = await player("moi");
    const other = await player("autre");

    expect(await findByCode(me.id, other.tag.toLowerCase())).toEqual([
      { username: other.username, tag: other.tag, rating: 0 },
    ]);
    expect(await findByCode(me.id, other.username)).toEqual([]);
  });

  it("ne se trouve pas soi-même, ni un bot", async () => {
    const me = await player("seul");
    const bot = await player("robot", NOT_HUMAN);

    expect(await findByCode(me.id, me.tag)).toEqual([]);
    expect(await findByCode(me.id, bot.tag)).toEqual([]);
  });

  it("distingue deux joueurs du même pseudo par leur code", async () => {
    const me = await player("chercheur");
    await player("jumeau");
    const second = await player("jumeau", "human", "bis");

    await requestFriend(me.id, second.tag);

    expect((await listFriends(me.id)).outgoing.map((f) => f.tag)).toEqual([second.tag]);
  });

  it("n'est amie qu'après acceptation par le destinataire", async () => {
    const alice = await player("alice");
    const bob = await player("bob");

    expect(await requestFriend(alice.id, bob.tag.toLowerCase())).toBe("sent");
    expect(await requestFriend(alice.id, bob.tag)).toBe("already");
    expect((await listFriends(alice.id)).outgoing.map((f) => f.username)).toEqual([bob.username]);
    expect((await listFriends(bob.id)).incoming.map((f) => f.username)).toEqual([alice.username]);
    // L'auteur de la demande ne peut pas l'accepter à la place de l'autre.
    expect(await acceptFriend(alice.id, bob.tag)).toBe(false);

    expect(await acceptFriend(bob.id, alice.tag)).toBe(true);

    expect((await listFriends(alice.id)).friends.map((f) => f.username)).toEqual([bob.username]);
    expect((await listFriends(bob.id)).friends.map((f) => f.username)).toEqual([alice.username]);
  });

  it("ne reconnaît un ami qu'après acceptation", async () => {
    const ida = await player("ida");
    const noe = await player("noe");
    await requestFriend(ida.id, noe.tag);
    expect(await friendByCode(ida.id, noe.tag)).toBeUndefined();

    await acceptFriend(noe.id, ida.tag);

    expect(await friendByCode(ida.id, noe.tag)).toEqual({ accountId: noe.id, tag: noe.tag });
  });

  it("accepte directement deux demandes croisées", async () => {
    const lea = await player("lea");
    const tom = await player("tom");

    await requestFriend(lea.id, tom.tag);

    expect(await requestFriend(tom.id, lea.tag)).toBe("accepted");
  });

  it("se retire des deux côtés", async () => {
    const zoe = await player("zoe");
    const max = await player("max");
    await requestFriend(zoe.id, max.tag);

    expect(await removeFriend(max.id, zoe.tag)).toBe(true);

    expect(await listFriends(zoe.id)).toEqual({ friends: [], incoming: [], outgoing: [] });
  });

  it("refuse soi-même, un inconnu et un bot", async () => {
    const solo = await player("solo");
    const bot = await player("machine", NOT_HUMAN);

    expect(await requestFriend(solo.id, solo.tag)).toBe("self");
    expect(await requestFriend(solo.id, "ZZZZZZ")).toBe("unknown");
    expect(await requestFriend(solo.id, bot.tag)).toBe("unknown");
  });
});

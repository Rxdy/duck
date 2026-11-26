import { and, asc, count, eq, ne, or, sql } from "drizzle-orm";
import { db } from "./db.js";
import { accounts, friendships } from "./schema.js";
import { parseTag } from "./playerTag.js";

/** Plafond de demandes sans réponse : un compte ne doit pas pouvoir en arroser les autres. */
export const MAX_PENDING_REQUESTS = 50;

export interface Friend {
  username: string;
  tag: string;
  rating: number;
}

export interface FriendLists {
  friends: Friend[];
  /** Demandes reçues, en attente de ta réponse. */
  incoming: Friend[];
  /** Demandes envoyées, en attente de la leur. */
  outgoing: Friend[];
}

export type RequestOutcome = "sent" | "accepted" | "already" | "unknown" | "self" | "too_many";

/**
 * Le joueur que désigne ce code (voir playerTag.ts). On ne cherche pas par
 * pseudo : il faut avoir reçu le code. Jamais l'email : il reste privé.
 */
export async function findByCode(accountId: string, term: string): Promise<Friend[]> {
  const tag = parseTag(term);
  if (!tag) return [];

  return db
    .select({ username: accounts.username, tag: accounts.tag, rating: accounts.rating })
    .from(accounts)
    .where(
      and(
        ne(accounts.id, accountId),
        // Un bot n'accepterait jamais une demande.
        eq(accounts.role, "human"),
        eq(accounts.tag, tag),
      ),
    );
}

async function findPlayer(tag: string): Promise<string | undefined> {
  const [found] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.role, "human"), eq(accounts.tag, tag.toUpperCase())));
  return found?.id;
}

const between = (a: string, b: string) =>
  or(
    and(eq(friendships.requesterId, a), eq(friendships.addresseeId, b)),
    and(eq(friendships.requesterId, b), eq(friendships.addresseeId, a)),
  );

/** Demande en ami. Si l'autre l'avait déjà demandé, les deux sont d'accord : c'est accepté. */
export async function requestFriend(accountId: string, tag: string): Promise<RequestOutcome> {
  const otherId = await findPlayer(tag);
  if (!otherId) return "unknown";
  if (otherId === accountId) return "self";

  const [existing] = await db.select().from(friendships).where(between(accountId, otherId));
  if (existing) {
    if (existing.status === "pending" && existing.requesterId === otherId) {
      await acceptFriend(accountId, tag);
      return "accepted";
    }
    return "already";
  }

  const [pending] = await db
    .select({ total: count() })
    .from(friendships)
    .where(and(eq(friendships.requesterId, accountId), eq(friendships.status, "pending")));
  if (pending!.total >= MAX_PENDING_REQUESTS) return "too_many";

  // Deux demandes croisées au même instant : l'index par paire n'en garde qu'une.
  const created = await db
    .insert(friendships)
    .values({ requesterId: accountId, addresseeId: otherId })
    .onConflictDoNothing()
    .returning();
  return created.length > 0 ? "sent" : "already";
}

/** Le compte derrière ce code, seulement si vous êtes amis. */
export async function friendByCode(
  accountId: string,
  tag: string,
): Promise<{ accountId: string; tag: string } | undefined> {
  const otherId = await findPlayer(tag);
  if (!otherId) return undefined;
  const [link] = await db.select().from(friendships).where(between(accountId, otherId));
  return link?.status === "accepted" ? { accountId: otherId, tag: tag.toUpperCase() } : undefined;
}

/** Seul le destinataire peut accepter. */
export async function acceptFriend(accountId: string, tag: string): Promise<boolean> {
  const otherId = await findPlayer(tag);
  if (!otherId) return false;
  const accepted = await db
    .update(friendships)
    .set({ status: "accepted" })
    .where(
      and(
        eq(friendships.requesterId, otherId),
        eq(friendships.addresseeId, accountId),
        eq(friendships.status, "pending"),
      ),
    )
    .returning();
  return accepted.length > 0;
}

/** Retirer un ami, refuser ou annuler une demande : la relation disparaît. */
export async function removeFriend(accountId: string, tag: string): Promise<boolean> {
  const otherId = await findPlayer(tag);
  if (!otherId) return false;
  const removed = await db.delete(friendships).where(between(accountId, otherId)).returning();
  return removed.length > 0;
}

export async function listFriends(accountId: string): Promise<FriendLists> {
  const rows = await db
    .select({
      username: accounts.username,
      tag: accounts.tag,
      rating: accounts.rating,
      status: friendships.status,
      requesterId: friendships.requesterId,
    })
    .from(friendships)
    .innerJoin(
      accounts,
      or(
        and(eq(friendships.requesterId, accountId), eq(accounts.id, friendships.addresseeId)),
        and(eq(friendships.addresseeId, accountId), eq(accounts.id, friendships.requesterId)),
      ),
    )
    .orderBy(sql`lower(${accounts.username})`, asc(accounts.tag));

  const lists: FriendLists = { friends: [], incoming: [], outgoing: [] };
  for (const { username, tag, rating, status, requesterId } of rows) {
    const list =
      status === "accepted" ? "friends" : requesterId === accountId ? "outgoing" : "incoming";
    lists[list].push({ username, tag, rating });
  }
  return lists;
}

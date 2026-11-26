import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { db, recordMatch } from "./db.js";
import {
  anonIdForAccount,
  getAccountIdForToken,
  loginAccount,
  loginWithGoogle,
  usernameFromName,
  registerAccount,
  EmailAlreadyUsedError,
  validateCredentials,
} from "./auth.js";
import { accounts, matches, sessions } from "./schema.js";

// Test d'intégration contre une vraie base Postgres (schéma appliqué une
// fois par vitest.global-setup.ts, voir db.test.ts) : la garantie utile ici
// est que le hash/vérification de mot de passe et les requêtes Drizzle
// fonctionnent réellement ensemble, pas juste en isolation.
const createdEmails: string[] = [];

afterAll(async () => {
  for (const email of createdEmails) {
    await db.delete(accounts).where(eq(accounts.email, email));
  }
});

let counter = 0;
function unique(): { username: string; email: string } {
  counter += 1;
  const suffix = `${Date.now()}-${counter}`;
  return { username: `test-user-${suffix}`, email: `test-${suffix}@example.com` };
}

describe("validateCredentials", () => {
  it("accepts a well-formed username, email, and a long-enough password", () => {
    expect(validateCredentials("alice", "alice@example.com", "Hunter22!x")).toBeUndefined();
  });

  it("rejects a username that's too short, too long, or has invalid characters", () => {
    expect(validateCredentials("ab", "alice@example.com", "Hunter22!x")).toBeDefined();
    expect(validateCredentials("a".repeat(21), "alice@example.com", "Hunter22!x")).toBeDefined();
    expect(validateCredentials("bad name!", "alice@example.com", "Hunter22!x")).toBeDefined();
  });

  it("rejects a malformed email", () => {
    expect(validateCredentials("alice", "not-an-email", "Hunter22!x")).toBeDefined();
  });

  it("juge le mot de passe sur ses bits, sans longueur ni familles imposées", () => {
    const check = (password: string) => validateCredentials("alice", "alice@example.com", password);

    expect(check("Short1!")).toContain("pas assez sûr");
    expect(check("Aaaaaaaaa1!")).toContain("pas assez sûr");
    expect(check("truiteverteaubordduzinc")).toBeUndefined();
    expect(check("Hunter22!x")).toBeUndefined();
  });
});

describe("progression d'invité", () => {
  it("compte au classement les parties jouées avant l'inscription", async () => {
    const guest = randomUUID();
    const rival = unique();
    const rivalAnonId = randomUUID();
    createdEmails.push(rival.email);
    await registerAccount(rival.username, rival.email, "Hunter22!x", rivalAnonId);
    await recordMatch({
      mapName: "test-invite",
      players: [
        { anonId: guest, name: "Joueur", color: "#FF4D6D", score: 15, isWinner: true },
        { anonId: rivalAnonId, name: rival.username, color: "#00C2D1", score: 3, isWinner: false },
      ],
    });

    const { username, email } = unique();
    createdEmails.push(email);
    await registerAccount(username, email, "Hunter22!x", guest);

    const [account] = await db.select().from(accounts).where(eq(accounts.email, email));
    expect(account!.rating).toBeGreaterThan(0);
    await db.delete(matches).where(eq(matches.mapName, "test-invite"));
  });

  it("garde l'identifiant du compte, et lui en attribue un s'il n'en a pas", async () => {
    const { username, email } = unique();
    createdEmails.push(email);
    const { token } = await registerAccount(username, email, "Hunter22!x");
    const accountId = (await getAccountIdForToken(token))!;

    const first = await anonIdForAccount(accountId);

    expect(first).toEqual(expect.any(String));
    expect(await anonIdForAccount(accountId)).toBe(first);
  });
});

describe("registerAccount / loginAccount", () => {
  it("registers a new account and returns a usable session token", async () => {
    const { username, email } = unique();
    createdEmails.push(email);

    const result = await registerAccount(username, email, "Hunter22!x", "anon-42");

    expect(result).toMatchObject({ username, email });
    expect(result.token).toEqual(expect.any(String));

    const [account] = await db.select().from(accounts).where(eq(accounts.email, email));
    expect(account?.anonId).toBe("anon-42");

    const [session] = await db.select().from(sessions).where(eq(sessions.token, result.token));
    expect(session?.accountId).toBe(account?.id);
  });

  it("resolves the account id for a valid session token", async () => {
    const { username, email } = unique();
    createdEmails.push(email);
    const result = await registerAccount(username, email, "Hunter22!x");

    const [account] = await db.select().from(accounts).where(eq(accounts.email, email));
    expect(await getAccountIdForToken(result.token)).toBe(account?.id);
  });

  it("returns undefined for an unknown session token", async () => {
    expect(await getAccountIdForToken("not-a-real-token")).toBeUndefined();
  });

  it("refuses to register the same email twice", async () => {
    const { username, email } = unique();
    createdEmails.push(email);

    await registerAccount(username, email, "Hunter22!x");

    await expect(
      registerAccount(unique().username, email, "anotherPassword"),
    ).rejects.toBeInstanceOf(EmailAlreadyUsedError);
  });

  it("laisse deux joueurs porter le même pseudo, chacun avec son code", async () => {
    const { username, email } = unique();
    const other = unique().email;
    createdEmails.push(email, other);

    const [first, second] = await Promise.all([
      registerAccount(username, email, "Hunter22!x"),
      registerAccount(username, other, "Hunter22!x"),
    ]);

    expect(first.tag).toMatch(/^[0-9A-F]{6}$/);
    expect(second.tag).not.toBe(first.tag);
    // Chacun se connecte avec son email.
    expect(await loginAccount(email, "Hunter22!x")).toMatchObject({ tag: first.tag });
    expect(await loginAccount(other, "Hunter22!x")).toMatchObject({ tag: second.tag });
  });

  it("n'accepte qu'un compte par email, même demandé deux fois en même temps", async () => {
    const { username, email } = unique();
    createdEmails.push(email);

    const results = await Promise.allSettled([
      registerAccount(username, email, "Hunter22!x"),
      registerAccount(username, email, "Hunter22!x"),
    ]);

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.find((r) => r.status === "rejected")).toMatchObject({
      reason: expect.any(EmailAlreadyUsedError),
    });
  });

  it("n'attribue jamais le même anon_id à deux comptes", async () => {
    // Deux comptes créés depuis le MÊME navigateur envoient le même id
    // anonyme. Le laisser passer donnait à chacun l'historique de l'autre :
    // le récapitulatif de la page Compte marquait « (toi) » sur les parties
    // du voisin.
    const anonId = `anon-partage-${randomUUID()}`;

    const premier = unique();
    createdEmails.push(premier.email);
    await registerAccount(premier.username, premier.email, "Hunter22!x", anonId);

    const second = unique();
    createdEmails.push(second.email);
    await registerAccount(second.username, second.email, "Hunter22!x", anonId);

    const rows = await db.select().from(accounts).where(eq(accounts.anonId, anonId));
    expect(rows).toHaveLength(1);
    expect(rows[0]!.username).toBe(premier.username);
  });

  it("inscrit quand même le second compte, mais sans identité anonyme", async () => {
    // Créer un second compte depuis le même appareil est parfaitement normal :
    // il perd seulement le rattachement des parties d'avant son inscription,
    // qui sont bien celles de quelqu'un d'autre.
    const anonId = `anon-second-${randomUUID()}`;

    const premier = unique();
    createdEmails.push(premier.email);
    await registerAccount(premier.username, premier.email, "Hunter22!x", anonId);

    const second = unique();
    createdEmails.push(second.email);
    const result = await registerAccount(second.username, second.email, "Hunter22!x", anonId);

    expect(result.username).toBe(second.username);
    const [row] = await db.select().from(accounts).where(eq(accounts.username, second.username));
    expect(row!.anonId).toBeNull();
  });

  it("logs in successfully with the email and the correct password", async () => {
    const { username, email } = unique();
    createdEmails.push(email);
    await registerAccount(username, email, "Correct-Password1");

    const result = await loginAccount(email, "Correct-Password1");

    expect(result).toMatchObject({ username, email });
  });

  it("ne connecte pas avec le pseudo ni avec le code", async () => {
    const { username, email } = unique();
    createdEmails.push(email);
    const { tag } = await registerAccount(username, email, "Correct-Password1");

    for (const identifier of [username, tag, `${username}#${tag}`]) {
      expect(await loginAccount(identifier, "Correct-Password1")).toBeUndefined();
    }
  });

  it("refuses login with the wrong password", async () => {
    const { username, email } = unique();
    createdEmails.push(email);
    await registerAccount(username, email, "Correct-Password1");

    expect(await loginAccount(email, "Wrong-Password1")).toBeUndefined();
  });

  it("refuses login for an unknown identifier", async () => {
    expect(await loginAccount("nobody@example.com", "whatever1")).toBeUndefined();
    expect(await loginAccount("nobody-at-all", "whatever1")).toBeUndefined();
  });
});

describe("connexion avec Google", () => {
  it("tire un pseudo valide du nom", () => {
    expect(usernameFromName("Zoé Dupont")).toBe("ZoeDupont");
    expect(usernameFromName("李")).toBe("Canard");
  });

  it("crée le compte une fois, puis le retrouve", async () => {
    const { email } = unique();
    createdEmails.push(email);
    const profile = { sub: `sub-${email}`, email, name: `G${Date.now()}` };

    const first = await loginWithGoogle(profile);
    const second = await loginWithGoogle(profile);

    expect(second.username).toBe(first.username);
    await expect(loginAccount(email, "")).resolves.toBeUndefined();
  });

  it("au rattachement, retire l'ancien mot de passe et les sessions", async () => {
    const { username, email } = unique();
    createdEmails.push(email);
    const before = await registerAccount(username, email, "Hunter22!x");

    const linked = await loginWithGoogle({ sub: `sub-${email}`, email, name: "Autre" });

    expect(linked.username).toBe(username);
    await expect(loginAccount(email, "Hunter22!x")).resolves.toBeUndefined();
    await expect(getAccountIdForToken(before.token)).resolves.toBeUndefined();
    await expect(getAccountIdForToken(linked.token)).resolves.toBeDefined();
  });
});

describe("unicité sans tenir compte de la casse", () => {
  it("refuse le même email écrit autrement", async () => {
    const { username, email } = unique();
    createdEmails.push(email);
    await registerAccount(username, email, "Hunter22!x");

    await expect(
      registerAccount(unique().username, email.toUpperCase(), "Hunter22!x"),
    ).rejects.toBeInstanceOf(EmailAlreadyUsedError);
    await expect(loginAccount(email.toUpperCase(), "Hunter22!x")).resolves.toBeDefined();
  });
});

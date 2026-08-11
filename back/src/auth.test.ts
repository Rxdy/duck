import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { db } from "./db.js";
import {
  getAccountIdForToken,
  loginAccount,
  registerAccount,
  UsernameOrEmailAlreadyUsedError,
  validateCredentials,
} from "./auth.js";
import { accounts, sessions } from "./schema.js";

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
    expect(validateCredentials("alice", "alice@example.com", "hunter22")).toBeUndefined();
  });

  it("rejects a username that's too short, too long, or has invalid characters", () => {
    expect(validateCredentials("ab", "alice@example.com", "hunter22")).toBeDefined();
    expect(validateCredentials("a".repeat(21), "alice@example.com", "hunter22")).toBeDefined();
    expect(validateCredentials("bad name!", "alice@example.com", "hunter22")).toBeDefined();
  });

  it("rejects a malformed email", () => {
    expect(validateCredentials("alice", "not-an-email", "hunter22")).toBeDefined();
  });

  it("rejects a password shorter than 8 characters", () => {
    expect(validateCredentials("alice", "alice@example.com", "short")).toBeDefined();
  });
});

describe("registerAccount / loginAccount", () => {
  it("registers a new account, grants the starter skins, and returns a usable session token", async () => {
    const { username, email } = unique();
    createdEmails.push(email);

    const result = await registerAccount(username, email, "hunter22", "anon-42");

    expect(result).toMatchObject({ username, email });
    expect(result.token).toEqual(expect.any(String));

    const [account] = await db.select().from(accounts).where(eq(accounts.email, email));
    expect(account?.anonId).toBe("anon-42");
    // Un skin de départ doit être équipé automatiquement (voir skins.ts#grantStarterSkins).
    expect(account?.equippedSkinId).toEqual(expect.any(String));

    const [session] = await db.select().from(sessions).where(eq(sessions.token, result.token));
    expect(session?.accountId).toBe(account?.id);
  });

  it("resolves the account id for a valid session token", async () => {
    const { username, email } = unique();
    createdEmails.push(email);
    const result = await registerAccount(username, email, "hunter22");

    const [account] = await db.select().from(accounts).where(eq(accounts.email, email));
    expect(await getAccountIdForToken(result.token)).toBe(account?.id);
  });

  it("returns undefined for an unknown session token", async () => {
    expect(await getAccountIdForToken("not-a-real-token")).toBeUndefined();
  });

  it("refuses to register the same email twice", async () => {
    const { username, email } = unique();
    createdEmails.push(email);

    await registerAccount(username, email, "hunter22");

    await expect(
      registerAccount(unique().username, email, "anotherPassword"),
    ).rejects.toBeInstanceOf(UsernameOrEmailAlreadyUsedError);
  });

  it("refuses to register the same username twice", async () => {
    const { username, email } = unique();
    createdEmails.push(email);

    await registerAccount(username, email, "hunter22");

    const second = unique();
    createdEmails.push(second.email);
    await expect(registerAccount(username, second.email, "anotherPassword")).rejects.toBeInstanceOf(
      UsernameOrEmailAlreadyUsedError,
    );
  });

  it("logs in successfully with the email and the correct password", async () => {
    const { username, email } = unique();
    createdEmails.push(email);
    await registerAccount(username, email, "correct-password");

    const result = await loginAccount(email, "correct-password");

    expect(result).toMatchObject({ username, email });
  });

  it("logs in successfully with the username and the correct password", async () => {
    const { username, email } = unique();
    createdEmails.push(email);
    await registerAccount(username, email, "correct-password");

    const result = await loginAccount(username, "correct-password");

    expect(result).toMatchObject({ username, email });
  });

  it("refuses login with the wrong password", async () => {
    const { username, email } = unique();
    createdEmails.push(email);
    await registerAccount(username, email, "correct-password");

    expect(await loginAccount(email, "wrong-password")).toBeUndefined();
  });

  it("refuses login for an unknown identifier", async () => {
    expect(await loginAccount("nobody@example.com", "whatever1")).toBeUndefined();
    expect(await loginAccount("nobody-at-all", "whatever1")).toBeUndefined();
  });
});

import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { eq, or } from "drizzle-orm";
import { db } from "./db.js";
import { accounts, sessions } from "./schema.js";
import { grantStarterSkins } from "./skins.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_PATTERN = /^[a-zA-Z0-9_-]{3,20}$/;
const MIN_PASSWORD_LENGTH = 8;
const SCRYPT_KEY_LENGTH = 64;

/**
 * scrypt (node:crypto, aucune dépendance native à installer) plutôt que
 * bcrypt/argon2 : suffisant pour un premier système de comptes, et évite les
 * soucis de compilation de binding natif dans des environnements variés.
 */
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, SCRYPT_KEY_LENGTH).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;

  const candidate = scryptSync(password, salt, SCRYPT_KEY_LENGTH);
  const expected = Buffer.from(hash, "hex");
  // timingSafeEqual exige deux buffers de même taille, sinon il lève une
  // exception au lieu de renvoyer false — vérifié explicitement avant.
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

export function validateCredentials(
  username: string,
  email: string,
  password: string,
): string | undefined {
  if (!USERNAME_PATTERN.test(username)) {
    return "Le pseudo doit faire 3 à 20 caractères (lettres, chiffres, - ou _).";
  }
  if (!EMAIL_PATTERN.test(email)) return "Adresse email invalide.";
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Le mot de passe doit faire au moins ${MIN_PASSWORD_LENGTH} caractères.`;
  }
  return undefined;
}

export class UsernameOrEmailAlreadyUsedError extends Error {}

export interface AuthResult {
  token: string;
  username: string;
  email: string;
}

/**
 * Crée un compte et une session dans la foulée (inscription = connecté
 * immédiatement, pas d'étape de vérification d'email pour l'instant), et
 * offre les skins de départ (voir back/src/skins.ts). `anonId`, si fourni,
 * est enregistré pour retrouver plus tard les parties jouées avant
 * l'inscription (voir back/src/db.ts).
 */
export async function registerAccount(
  username: string,
  email: string,
  password: string,
  anonId?: string,
): Promise<AuthResult> {
  const existing = await db
    .select()
    .from(accounts)
    .where(or(eq(accounts.username, username), eq(accounts.email, email)));
  if (existing.length > 0) throw new UsernameOrEmailAlreadyUsedError();

  const [account] = await db
    .insert(accounts)
    .values({ username, email, passwordHash: hashPassword(password), anonId: anonId ?? null })
    .returning();

  await grantStarterSkins(account!.id);

  return createSession(account!.id, username, email);
}

/**
 * `identifier` accepte le pseudo ou l'email indifféremment (les deux sont
 * uniques, voir registerAccount). `undefined` si inconnu ou mot de passe
 * incorrect — pas de distinction entre les deux cas, pour ne pas révéler
 * quels identifiants existent.
 */
export async function loginAccount(
  identifier: string,
  password: string,
): Promise<AuthResult | undefined> {
  const [account] = await db
    .select()
    .from(accounts)
    .where(or(eq(accounts.email, identifier), eq(accounts.username, identifier)));
  if (!account || !verifyPassword(password, account.passwordHash)) return undefined;

  return createSession(account.id, account.username, account.email);
}

/** Résout le compte propriétaire d'un token de session, `undefined` s'il est invalide/expiré. */
export async function getAccountIdForToken(token: string): Promise<string | undefined> {
  const [session] = await db.select().from(sessions).where(eq(sessions.token, token));
  return session?.accountId;
}

export interface AccountProfile {
  username: string;
  email: string;
  anonId: string | null;
}

/** Utilisé pour la page Compte (voir back/src/index.ts GET /me). */
export async function getAccountById(accountId: string): Promise<AccountProfile | undefined> {
  const [account] = await db.select().from(accounts).where(eq(accounts.id, accountId));
  if (!account) return undefined;
  return { username: account.username, email: account.email, anonId: account.anonId };
}

async function createSession(
  accountId: string,
  username: string,
  email: string,
): Promise<AuthResult> {
  const token = randomUUID();
  await db.insert(sessions).values({ token, accountId });
  return { token, username, email };
}

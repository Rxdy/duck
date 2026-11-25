import { randomBytes, randomInt, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { eq, or, sql } from "drizzle-orm";
import { db } from "./db.js";
import { accounts, sessions } from "./schema.js";
import { passwordEntropy, REQUIRED_BITS } from "./passwordStrength.js";
import { grantStarterSkins } from "./skins.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_PATTERN = /^[a-zA-Z0-9_-]{3,20}$/;
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
  if (passwordEntropy(password) < REQUIRED_BITS) {
    return "Mot de passe pas assez sûr : rallonge-le, ou mêle majuscules, chiffres et symboles.";
  }
  return undefined;
}

export class UsernameOrEmailAlreadyUsedError extends Error {
  constructor(readonly field?: "username" | "email") {
    super("pseudo ou email déjà utilisé");
  }
}

/** Comparaison sans tenir compte de la casse : « Rudy » et « rudy » sont le même pseudo. */
const sameText = (column: typeof accounts.username | typeof accounts.email, value: string) =>
  sql`lower(${column}) = ${value.toLowerCase()}`;

/**
 * Code SQLSTATE d'une violation de contrainte d'unicité sous PostgreSQL.
 *
 * C'est la base qui arbitre les doublons, pas un `select` préalable : entre le
 * `select` et le `insert` il existe une fenêtre où deux inscriptions
 * simultanées du même pseudo passent toutes les deux la vérification. La
 * seconde remontait alors l'erreur brute du driver — donc un 500 au client
 * là où un 400 s'imposait.
 */
const UNIQUE_VIOLATION = "23505";

/**
 * La chaîne des `cause` est parcourue, pas seulement l'erreur du dessus :
 * Drizzle enveloppe l'erreur du driver dans un `DrizzleQueryError` qui ne
 * porte pas le code SQLSTATE, celui-ci reste sur le `DatabaseError` de `pg`
 * en dessous. Remonter la chaîne évite d'avoir à connaître le nombre exact
 * d'emballages, qui est un détail de version.
 */
function violatedConstraint(error: unknown): string | undefined {
  for (let current = error; current instanceof Error; current = current.cause) {
    const candidate = current as { code?: unknown; constraint?: unknown };
    if (candidate.code === UNIQUE_VIOLATION && typeof candidate.constraint === "string") {
      return candidate.constraint;
    }
  }
  return undefined;
}

/**
 * Nom de l'index qui garantit qu'un `anon_id` n'appartient qu'à un compte
 * (voir db/init/10-anon-id-unique.sql).
 */
const ANON_ID_CONSTRAINT = "accounts_anon_id_key";

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
  // Pas de `select` de vérification avant l'insertion : seule la contrainte
  // d'unicité de la base tranche sans fenêtre de course (voir
  // UNIQUE_VIOLATION). C'est aussi un aller-retour de moins.
  // Vérification préalable pour dire LEQUEL est pris. Les index uniques de la
  // base (db/init/13-unique-sans-casse.sql) tranchent les inscriptions simultanées.
  const address = email.toLowerCase();
  const taken = await db
    .select({ username: accounts.username, email: accounts.email })
    .from(accounts)
    .where(or(sameText(accounts.username, username), sameText(accounts.email, address)));
  if (taken.length > 0) {
    const nameTaken = taken.some((a) => a.username.toLowerCase() === username.toLowerCase());
    throw new UsernameOrEmailAlreadyUsedError(nameTaken ? "username" : "email");
  }

  const values = {
    username,
    email: address,
    passwordHash: hashPassword(password),
    anonId: anonId ?? null,
  };

  let account;
  try {
    [account] = await db.insert(accounts).values(values).returning();
  } catch (error) {
    const constraint = violatedConstraint(error);
    if (constraint === undefined) throw error;

    // L'`anon_id` du navigateur appartient déjà à un autre compte : il n'y a
    // rien d'anormal à créer un second compte depuis le même appareil, alors
    // on l'inscrit SANS revendiquer cette identité. Il perd le rattachement
    // des parties d'avant son inscription — elles sont bien celles de
    // quelqu'un d'autre.
    if (constraint === ANON_ID_CONSTRAINT) {
      [account] = await db
        .insert(accounts)
        .values({ ...values, anonId: null })
        .returning();
    } else {
      throw new UsernameOrEmailAlreadyUsedError(
        constraint.includes("email") ? "email" : "username",
      );
    }
  }

  await grantStarterSkins(account!.id);

  return createSession(account!.id, username, address);
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
  const matches = await db
    .select()
    .from(accounts)
    .where(or(sameText(accounts.email, identifier), sameText(accounts.username, identifier)));
  // Plusieurs lignes ne sont possibles qu'avec d'anciens comptes ne différant que par la casse.
  const account = matches.find(
    (a) => a.passwordHash !== null && verifyPassword(password, a.passwordHash),
  );
  if (!account) return undefined;

  return createSession(account.id, account.username, account.email);
}

/** Ce que Google atteste sur la personne, une fois son jeton vérifié (voir google.ts). */
export interface GoogleProfile {
  sub: string;
  email: string;
  name: string;
}

/** Un pseudo valide tiré du nom Google. Jamais de l'email, que le classement rendrait public. */
export function usernameFromName(name: string): string {
  const cleaned = name
    .normalize("NFD")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 15);
  return cleaned.length >= 3 ? cleaned : "Canard";
}

/**
 * Connexion avec Google : retrouve le compte, le rattache, ou le crée.
 *
 * Rattachement par email : l'inscription par mot de passe ne vérifie PAS
 * l'adresse, n'importe qui a donc pu créer un compte avec l'email d'un autre.
 * Google, lui, prouve à qui elle appartient. Au rattachement, l'ancien mot de
 * passe et les sessions ouvertes sont donc effacés : sans ça, celui qui avait
 * créé le compte garderait l'accès à côté de son vrai propriétaire.
 */
export async function loginWithGoogle(
  profile: GoogleProfile,
  anonId?: string,
): Promise<AuthResult> {
  const [known] = await db.select().from(accounts).where(eq(accounts.googleSub, profile.sub));
  if (known) return createSession(known.id, known.username, known.email);

  const [sameEmail] = await db
    .select()
    .from(accounts)
    .where(sameText(accounts.email, profile.email));
  if (sameEmail) {
    await db
      .update(accounts)
      .set({ googleSub: profile.sub, passwordHash: null })
      .where(eq(accounts.id, sameEmail.id));
    await db.delete(sessions).where(eq(sessions.accountId, sameEmail.id));
    return createSession(sameEmail.id, sameEmail.username, sameEmail.email);
  }

  const base = usernameFromName(profile.name);
  let username = base;
  let claimedAnonId = anonId ?? null;
  for (let attempt = 0; attempt < 8; attempt++) {
    const [clash] = await db.select().from(accounts).where(sameText(accounts.username, username));
    if (clash) {
      username = `${base}${randomInt(1000, 10000)}`;
      continue;
    }
    try {
      const [created] = await db
        .insert(accounts)
        .values({
          username,
          email: profile.email.toLowerCase(),
          googleSub: profile.sub,
          anonId: claimedAnonId,
        })
        .returning();
      await grantStarterSkins(created!.id);
      return createSession(created!.id, username, profile.email);
    } catch (error) {
      const constraint = violatedConstraint(error);
      if (constraint === undefined) throw error;
      if (constraint === ANON_ID_CONSTRAINT) claimedAnonId = null;
      else username = `${base}${randomInt(1000, 10000)}`;
    }
  }
  throw new UsernameOrEmailAlreadyUsedError();
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

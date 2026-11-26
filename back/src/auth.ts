import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "./db.js";
import { accounts, sessions } from "./schema.js";
import { passwordEntropy, REQUIRED_BITS } from "./passwordStrength.js";
import { giveRandomItem } from "./wardrobe.js";
import { replayRating } from "./rating.js";

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

export class EmailAlreadyUsedError extends Error {
  constructor() {
    super("email déjà utilisé");
  }
}

/** Comparaison sans tenir compte de la casse : « Rudy » et « rudy » s'écrivent pareil. */
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
const TAG_CONSTRAINT = "accounts_tag_key";
const INSERT_ATTEMPTS = 5;

type Account = typeof accounts.$inferSelect;

/**
 * Crée la ligne du compte. Deux conflits se réparent seuls : un code joueur déjà
 * tiré (on en tire un autre), et un `anon_id` de navigateur déjà revendiqué (le
 * compte s'inscrit sans lui : ces parties sont celles de quelqu'un d'autre).
 * Reste l'email, que seul le joueur peut changer.
 */
async function insertAccount(values: typeof accounts.$inferInsert): Promise<Account> {
  let anonId = values.anonId ?? null;
  for (let attempt = 1; ; attempt++) {
    try {
      const [created] = await db
        .insert(accounts)
        .values({ ...values, anonId })
        .returning();
      return created!;
    } catch (error) {
      const constraint = violatedConstraint(error);
      if (constraint === undefined) throw error;
      if (constraint.includes("email")) throw new EmailAlreadyUsedError();
      if (constraint === ANON_ID_CONSTRAINT) anonId = null;
      else if (constraint !== TAG_CONSTRAINT || attempt >= INSERT_ATTEMPTS) throw error;
    }
  }
}

export interface AuthResult {
  token: string;
  username: string;
  email: string;
  tag: string;
}

/**
 * Crée un compte et une session dans la foulée (inscription = connecté
 * immédiatement, pas d'étape de vérification d'email pour l'instant), et
 * offre un accessoire au hasard (voir back/src/wardrobe.ts). `anonId`, si fourni,
 * est enregistré pour retrouver plus tard les parties jouées avant
 * l'inscription (voir back/src/db.ts).
 */
export async function registerAccount(
  username: string,
  email: string,
  password: string,
  anonId?: string,
): Promise<AuthResult> {
  // Vérification préalable pour répondre clairement ; l'index unique de la base
  // (db/init/13-unique-sans-casse.sql) tranche les inscriptions simultanées.
  const address = email.toLowerCase();
  const taken = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(sameText(accounts.email, address));
  if (taken.length > 0) throw new EmailAlreadyUsedError();

  const account = await insertAccount({
    username,
    email: address,
    passwordHash: hashPassword(password),
    anonId: anonId ?? null,
  });

  await giveRandomItem(account.id, "signup");
  await keepGuestProgress(account.id, account.anonId);

  return createSession(account);
}

/**
 * Connexion par email, seul identifiant que son propriétaire est seul à porter
 * et à connaître. `undefined` si inconnu ou mot de passe incorrect — sans
 * distinction, pour ne pas révéler quels comptes existent.
 */
export async function loginAccount(
  email: string,
  password: string,
): Promise<AuthResult | undefined> {
  const found = await db.select().from(accounts).where(sameText(accounts.email, email.trim()));
  // Plusieurs lignes ne sont possibles qu'avec d'anciens comptes ne différant que par la casse.
  const account = found.find(
    (a) => a.passwordHash !== null && verifyPassword(password, a.passwordHash),
  );
  return account && createSession(account);
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
  if (known) return createSession(known);

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
    return createSession(sameEmail);
  }

  const created = await insertAccount({
    username: usernameFromName(profile.name),
    email: profile.email.toLowerCase(),
    googleSub: profile.sub,
    anonId: anonId ?? null,
  });
  await giveRandomItem(created.id, "signup");
  await keepGuestProgress(created.id, created.anonId);
  return createSession(created);
}

/** Les parties jouées en invité comptent au classement du compte qui les revendique. */
async function keepGuestProgress(accountId: string, anonId: string | null): Promise<void> {
  if (!anonId) return;
  const rating = await replayRating(anonId);
  await db.update(accounts).set({ rating }).where(eq(accounts.id, accountId));
}

/**
 * Identifiant sous lequel enregistrer les parties d'un compte : le sien, quel
 * que soit celui du navigateur utilisé (il est renouvelé à l'inscription, et
 * diffère d'un appareil à l'autre). Attribué s'il n'en a pas encore.
 */
export async function anonIdForAccount(accountId: string): Promise<string> {
  await db
    .update(accounts)
    .set({ anonId: randomUUID() })
    .where(and(eq(accounts.id, accountId), isNull(accounts.anonId)));
  const [account] = await db.select().from(accounts).where(eq(accounts.id, accountId));
  return account!.anonId!;
}

/** Résout le compte propriétaire d'un token de session, `undefined` s'il est invalide/expiré. */
export async function getAccountIdForToken(token: string): Promise<string | undefined> {
  const [session] = await db.select().from(sessions).where(eq(sessions.token, token));
  return session?.accountId;
}

export interface AccountProfile {
  username: string;
  tag: string;
  email: string;
  anonId: string | null;
}

/** Utilisé pour la page Compte (voir back/src/index.ts GET /me). */
export async function getAccountById(accountId: string): Promise<AccountProfile | undefined> {
  const [account] = await db.select().from(accounts).where(eq(accounts.id, accountId));
  if (!account) return undefined;
  const { username, tag, email, anonId } = account;
  return { username, tag, email, anonId };
}

async function createSession(account: Account): Promise<AuthResult> {
  const token = randomUUID();
  await db.insert(sessions).values({ token, accountId: account.id });
  return { token, username: account.username, email: account.email, tag: account.tag };
}

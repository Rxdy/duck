import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { eq, or } from "drizzle-orm";
import { db } from "./db.js";
import { accounts, sessions } from "./schema.js";
import { grantStarterSkins } from "./skins.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_PATTERN = /^[a-zA-Z0-9_-]{3,20}$/;
/**
 * Socle du mot de passe. Volontairement REDONDANT avec la jauge de
 * l'inscription (front/src/lib/passwordStrength.ts) : la jauge guide, elle ne
 * protège pas — n'importe qui peut poster directement sur /register sans
 * passer par le formulaire.
 *
 * La note d'entropie, elle, reste côté client : c'est une aide au choix, pas
 * une frontière de sécurité, et la dupliquer ici imposerait de maintenir deux
 * copies du même calcul (front/ et back/ ne partagent pas de code, voir
 * docs/06-architecture-technique.md).
 */
const MIN_PASSWORD_LENGTH = 10;
const PASSWORD_CLASSES = [
  { pattern: /[a-z]/, label: "une minuscule" },
  { pattern: /[A-Z]/, label: "une majuscule" },
  { pattern: /[0-9]/, label: "un chiffre" },
  { pattern: /[^a-zA-Z0-9]/, label: "un caractère spécial" },
];
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
  // Tout ce qui manque, d'un coup : renvoyer la première erreur venue ferait
  // recommencer le joueur autant de fois qu'il lui manque de familles.
  const missing = PASSWORD_CLASSES.filter((c) => !c.pattern.test(password)).map((c) => c.label);
  if (missing.length > 0) {
    return `Le mot de passe doit contenir au moins ${missing.join(", ")}.`;
  }
  return undefined;
}

export class UsernameOrEmailAlreadyUsedError extends Error {}

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
  const values = {
    username,
    email,
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
      throw new UsernameOrEmailAlreadyUsedError();
    }
  }

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

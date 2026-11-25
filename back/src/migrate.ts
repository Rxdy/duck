// Applique le schéma SQL (db/init/*.sql) au démarrage du serveur.
//
// Les fichiers sont idempotents (create ... if not exists, alter ... if not exists) : on peut les rejouer à chaque
// démarrage. Ainsi une mise à jour en production applique les nouvelles migrations toute seule, au lieu de ne les
// jouer qu'à la création du volume Postgres. Un verrou consultatif évite que deux instances qui démarrent en même
// temps s'exécutent en parallèle.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

const here = dirname(fileURLToPath(import.meta.url));
// Clé arbitraire, propre à Duck, du verrou consultatif Postgres.
const LOCK_KEY = 7_274_001;

/** SCHEMA_DIR, sinon db/init dans l'image (/app/db/init) ou à la racine du dépôt (en développement). */
export function findSchemaDir(): string {
  const candidates = [
    process.env.SCHEMA_DIR,
    join(here, "..", "db", "init"),
    join(here, "..", "..", "db", "init"),
  ];
  for (const dir of candidates) if (dir && existsSync(dir)) return dir;
  throw new Error("Dossier du schéma SQL introuvable (db/init). Définir SCHEMA_DIR.");
}

/** Applique tous les .sql du dossier, dans l'ordre alphabétique. Renvoie les fichiers appliqués. */
export async function applySchema(
  connectionString: string,
  dir: string = findSchemaDir(),
): Promise<string[]> {
  const files = readdirSync(dir)
    .filter((file) => file.endsWith(".sql"))
    .sort();
  const client = new Client({ connectionString });
  await client.connect();
  try {
    await client.query("select pg_advisory_lock($1)", [LOCK_KEY]);
    try {
      for (const file of files) await client.query(readFileSync(join(dir, file), "utf-8"));
    } finally {
      await client.query("select pg_advisory_unlock($1)", [LOCK_KEY]);
    }
    return files;
  } finally {
    await client.end();
  }
}

const CONNECTION_ERRORS = new Set([
  "ECONNREFUSED",
  "ENOTFOUND",
  "ETIMEDOUT",
  "ECONNRESET",
  "57P03",
  "08006",
  "08001",
]);

/** Base injoignable ou en train de démarrer : on peut réessayer. Une erreur SQL, elle, est définitive. */
export function isConnectionError(error: unknown): boolean {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === "string" && CONNECTION_ERRORS.has(code);
}

interface WaitOptions {
  attempts?: number;
  delayMs?: number;
  log?: (message: string) => void;
}

/** Comme applySchema, en patientant si la base démarre encore (conteneurs lancés ensemble). */
export async function applySchemaWhenReady(
  connectionString: string,
  { attempts = 30, delayMs = 1000, log = console.log }: WaitOptions = {},
): Promise<string[]> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await applySchema(connectionString);
    } catch (error) {
      if (!isConnectionError(error) || attempt >= attempts) throw error;
      log(`Base de données injoignable (essai ${attempt}/${attempts}), nouvel essai…`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

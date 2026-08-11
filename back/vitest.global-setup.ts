import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const INIT_DIR = join(__dirname, "..", "db", "init");
const DATABASE_URL = process.env.DATABASE_URL ?? "postgres://duck:duck@localhost:5432/duck";

/**
 * Applique une seule fois tout db/init/*.sql avant de lancer les tests
 * (voir db/apply-schema.sh, même rôle en dehors de Vitest). Remplace les
 * `create table if not exists` dupliqués dans chaque fichier de test : ceux-ci
 * ne géraient jamais l'évolution d'une table déjà existante (ex. colonne
 * ajoutée), et s'exécutaient en plus en parallèle d'un fichier de test à
 * l'autre (Vitest lance les fichiers concurremment), ce qui provoquait de
 * vraies erreurs de conflit côté Postgres.
 */
export async function setup(): Promise<void> {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    const files = readdirSync(INIT_DIR)
      .filter((file) => file.endsWith(".sql"))
      .sort();
    for (const file of files) {
      await client.query(readFileSync(join(INIT_DIR, file), "utf-8"));
    }
  } finally {
    await client.end();
  }
}

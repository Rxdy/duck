import { applySchema } from "./src/migrate.js";

const DATABASE_URL = process.env.DATABASE_URL ?? "postgres://duck:duck@localhost:5432/duck";

/**
 * Applique le schéma (db/init/*.sql) une seule fois avant les tests, par le MÊME code que le démarrage du serveur
 * (src/migrate.ts) : ce que la production exécute est donc exercé par chaque test.
 */
export async function setup(): Promise<void> {
  await applySchema(DATABASE_URL);
}

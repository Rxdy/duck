import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/pg-core";
import type { PgTable } from "drizzle-orm/pg-core";
import { afterAll, describe, expect, it } from "vitest";
import { db } from "./db.js";
import { accountSkins, accounts, maps, matches, sessions, skins } from "./schema.js";

/**
 * Tests de la BASE elle-même, distincts des tests qui l'utilisent (auth,
 * maps, rating...). Ils portent sur ce que le code applicatif ne peut pas
 * vérifier tout seul :
 *
 * 1. **La dérive de schéma.** `db/init/*.sql` et `back/src/schema.ts` décrivent
 *    les mêmes tables et sont maintenus À LA MAIN, sans outil de migration.
 *    Une colonne ajoutée d'un côté et oubliée de l'autre ne casse rien au
 *    typage — ça explose à l'exécution, en production, sur une requête.
 * 2. **Les garanties que la base est censée offrir** : unicité, suppression en
 *    cascade, valeurs par défaut. Le code compte dessus sans jamais les
 *    revérifier.
 * 3. **L'idempotence des scripts d'init**, puisqu'ils sont rejoués à chaque
 *    démarrage d'un environnement.
 */
const INIT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "db", "init");

const TABLES: PgTable[] = [accounts, sessions, skins, accountSkins, matches, maps];

const createdAccountIds: string[] = [];

afterAll(async () => {
  for (const id of createdAccountIds) {
    await db.delete(accounts).where(eq(accounts.id, id));
  }
});

async function freshAccount(): Promise<string> {
  const suffix = randomUUID().slice(0, 8);
  const [row] = await db
    .insert(accounts)
    .values({
      username: `schema-${suffix}`,
      email: `schema-${suffix}@example.test`,
      passwordHash: "peu-importe",
    })
    .returning();
  createdAccountIds.push(row!.id);
  return row!.id;
}

interface DbColumn {
  column_name: string;
  is_nullable: string;
  column_default: string | null;
}

async function columnsOf(table: string): Promise<DbColumn[]> {
  const result = await db.execute(
    sql`select column_name, is_nullable, column_default
        from information_schema.columns
        where table_schema = 'public' and table_name = ${table}`,
  );
  return result.rows as unknown as DbColumn[];
}

describe("le schéma Drizzle et la base restent alignés", () => {
  it.each(TABLES.map((t) => [getTableConfig(t).name, t] as const))(
    "%s a exactement les colonnes déclarées dans schema.ts",
    async (_name, table) => {
      const config = getTableConfig(table);
      const declared = config.columns.map((c) => c.name).sort();
      const actual = (await columnsOf(config.name)).map((c) => c.column_name).sort();

      // Comparaison dans les DEUX sens : une colonne oubliée dans le SQL
      // casse à l'exécution, une colonne oubliée dans Drizzle est invisible
      // pour tout le code — les deux sont des bugs.
      expect(actual, `table ${config.name}`).toEqual(declared);
    },
  );

  it.each(TABLES.map((t) => [getTableConfig(t).name, t] as const))(
    "%s a les mêmes colonnes obligatoires des deux côtés",
    async (_name, table) => {
      const config = getTableConfig(table);
      const actual = await columnsOf(config.name);

      for (const column of config.columns) {
        const inDb = actual.find((c) => c.column_name === column.name);
        const requisEnBase = inDb?.is_nullable === "NO";
        // Une colonne déclarée obligatoire côté code mais nullable en base
        // laisse passer des lignes que le code croit impossibles.
        expect(requisEnBase, `${config.name}.${column.name}`).toBe(column.notNull);
      }
    },
  );

  it("applique les valeurs par défaut attendues sur un compte neuf", async () => {
    const id = await freshAccount();
    const [row] = await db.select().from(accounts).where(eq(accounts.id, id));

    // Ces deux-là sont lus partout sans jamais être vérifiés : un défaut
    // manquant en base donnerait des comptes sans classement ni rôle. Le
    // classement démarre à zéro (voir rating.ts#STARTING_RATING).
    expect(row!.rating).toBe(0);
    expect(row!.role).toBe("human");
    expect(row!.createdAt).toBeInstanceOf(Date);
  });
});

describe("les garanties de la base", () => {
  it("refuse deux comptes avec le même pseudo", async () => {
    const id = await freshAccount();
    const [existing] = await db.select().from(accounts).where(eq(accounts.id, id));

    await expect(
      db.insert(accounts).values({
        username: existing!.username,
        email: `autre-${randomUUID()}@example.test`,
        passwordHash: "x",
      }),
    ).rejects.toThrow();
  });

  it("refuse deux comptes avec la même adresse", async () => {
    const id = await freshAccount();
    const [existing] = await db.select().from(accounts).where(eq(accounts.id, id));

    await expect(
      db.insert(accounts).values({
        username: `autre-${randomUUID().slice(0, 8)}`,
        email: existing!.email,
        passwordHash: "x",
      }),
    ).rejects.toThrow();
  });

  it("emporte sessions, skins et cartes quand un compte est supprimé", async () => {
    // Sans cascade, supprimer un compte laisserait des sessions valides et
    // des cartes appartenant à personne.
    const accountId = await freshAccount();
    const token = `token-${randomUUID()}`;
    await db.insert(sessions).values({ token, accountId });

    // On EMPRUNTE un skin du catalogue au lieu d'en créer un : le catalogue
    // est partagé avec les autres fichiers de test, et y ajouter puis retirer
    // une ligne faisait échouer, au hasard, l'attribution des skins de départ
    // qui lit tout le catalogue avant d'insérer.
    const [skin] = await db.select().from(skins).limit(1);
    if (skin) await db.insert(accountSkins).values({ accountId, skinId: skin.id });

    await db.insert(maps).values({
      name: "Carte du compte",
      ownerAccountId: accountId,
      spawnCount: 2,
      width: 9,
      height: 9,
      tiles: [["wall"]],
    });

    await db.delete(accounts).where(eq(accounts.id, accountId));

    expect(await db.select().from(sessions).where(eq(sessions.token, token))).toHaveLength(0);
    expect(
      await db.select().from(accountSkins).where(eq(accountSkins.accountId, accountId)),
    ).toHaveLength(0);
    expect(await db.select().from(maps).where(eq(maps.ownerAccountId, accountId))).toHaveLength(0);
  });

  it("laisse vivre une partie enregistrée après la suppression d'un compte", async () => {
    // Volontaire : les parties gardent un identifiant anonyme, pas une clé
    // étrangère. Effacer un compte ne doit pas réécrire l'historique des
    // adversaires qui, eux, ont bien joué cette partie.
    const anonId = `anon-${randomUUID()}`;
    await db.insert(matches).values({
      mapName: `test-${randomUUID()}`,
      players: [{ anonId, name: "Parti", color: "#FF4D6D", score: 3, isWinner: false }],
      winnerAnonId: null,
    });

    const rows = await db
      .select()
      .from(matches)
      .where(sql`${matches.players}::text like ${`%${anonId}%`}`);
    expect(rows).toHaveLength(1);
    await db.delete(matches).where(eq(matches.id, rows[0]!.id));
  });
});

describe("les scripts d'initialisation", () => {
  const files = readdirSync(INIT_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  it("il y en a, et ils sont numérotés dans l'ordre d'application", () => {
    expect(files.length).toBeGreaterThan(0);
    expect(files).toEqual([...files].sort());
    for (const file of files) expect(file).toMatch(/^\d{2}-/);
  });

  it.each(files)("%s peut être rejoué sans erreur", async (file) => {
    // Ils sont appliqués à chaque démarrage d'environnement (voir
    // vitest.global-setup.ts et db/apply-schema.sh) : un script qui ne
    // supporte pas d'être rejoué bloquerait n'importe quelle machine neuve
    // au deuxième lancement.
    // Rejoué dans une transaction ANNULÉE : le DDL est transactionnel sous
    // PostgreSQL, donc le script s'exécute réellement (c'est bien lui qu'on
    // teste) sans rien laisser derrière. Sans ça, ce test modifierait le
    // schéma sous les pieds des autres fichiers, lancés en parallèle.
    const statements = readFileSync(join(INIT_DIR, file), "utf-8");
    await db.execute(sql.raw("begin"));
    try {
      await expect(db.execute(sql.raw(statements))).resolves.toBeDefined();
    } finally {
      await db.execute(sql.raw("rollback"));
    }
  });
});

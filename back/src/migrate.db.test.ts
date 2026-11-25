import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { applySchema, applySchemaWhenReady, findSchemaDir, isConnectionError } from "./migrate.js";

const ADMIN_URL = process.env.DATABASE_URL ?? "postgres://duck:duck@localhost:5432/duck";
const nomBase = `duck_migrate_${process.pid}_${Date.now()}`;

function urlDe(base: string): string {
  const url = new URL(ADMIN_URL);
  url.pathname = `/${base}`;
  return url.toString();
}

async function tables(url: string): Promise<string[]> {
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    const res = await client.query<{ table_name: string }>(
      "select table_name from information_schema.tables where table_schema = 'public' order by 1",
    );
    return res.rows.map((r) => r.table_name);
  } finally {
    await client.end();
  }
}

// Chaque test part d'une base VIDE, comme le premier démarrage de la production.
describe("migrations au démarrage", () => {
  const admin = new Client({ connectionString: ADMIN_URL });

  beforeAll(async () => {
    await admin.connect();
    await admin.query(`create database ${nomBase}`);
  });
  afterAll(async () => {
    await admin.query(`drop database if exists ${nomBase} with (force)`);
    await admin.end();
  });

  it("base vide : crée toutes les tables", async () => {
    expect(await tables(urlDe(nomBase))).toEqual([]);
    const fichiers = await applySchema(urlDe(nomBase));
    expect(fichiers.length).toBeGreaterThanOrEqual(11);
    expect(fichiers).toEqual([...fichiers].sort());
    expect((await tables(urlDe(nomBase))).length).toBeGreaterThan(5);
  });

  it("rejouable : un second démarrage ne casse rien et ne change rien", async () => {
    const avant = await tables(urlDe(nomBase));
    await applySchema(urlDe(nomBase));
    expect(await tables(urlDe(nomBase))).toEqual(avant);
  });

  it("deux instances qui démarrent en même temps réussissent toutes les deux", async () => {
    await expect(
      Promise.all([
        applySchema(urlDe(nomBase)),
        applySchema(urlDe(nomBase)),
        applySchema(urlDe(nomBase)),
      ]),
    ).resolves.toHaveLength(3);
  });

  it("migration en erreur : le démarrage échoue tout de suite, sans nouvel essai", async () => {
    const dir = mkdtempSync(join(tmpdir(), "duck-schema-"));
    try {
      writeFileSync(join(dir, "01-cassee.sql"), "create table pas_valide (");
      await expect(applySchema(urlDe(nomBase), dir)).rejects.toThrow();
      // Une erreur SQL n'est pas « réessayable » : applySchemaWhenReady la laisse remonter au lieu de boucler.
      expect(isConnectionError(new Error("syntax error"))).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("le verrou est libéré même après une erreur (la migration suivante peut passer)", async () => {
    const dir = mkdtempSync(join(tmpdir(), "duck-schema-"));
    try {
      writeFileSync(join(dir, "01-cassee.sql"), "select 1/0");
      await expect(applySchema(urlDe(nomBase), dir)).rejects.toThrow();
      await expect(applySchema(urlDe(nomBase))).resolves.toBeDefined();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("attente de la base", () => {
  it("base injoignable : réessaie puis abandonne après le nombre d'essais", async () => {
    const messages: string[] = [];
    await expect(
      applySchemaWhenReady("postgres://duck:duck@127.0.0.1:1/duck", {
        attempts: 3,
        delayMs: 5,
        log: (m) => messages.push(m),
      }),
    ).rejects.toThrow();
    expect(messages).toHaveLength(2);
  });

  it("isConnectionError : reconnaît les erreurs réseau et de démarrage, pas les erreurs SQL", () => {
    expect(isConnectionError({ code: "ECONNREFUSED" })).toBe(true);
    expect(isConnectionError({ code: "57P03" })).toBe(true);
    expect(isConnectionError({ code: "42601" })).toBe(false);
    expect(isConnectionError(null)).toBe(false);
  });

  it("trouve le dossier du schéma", () => {
    expect(findSchemaDir()).toMatch(/db[\\/]init$/);
  });
});

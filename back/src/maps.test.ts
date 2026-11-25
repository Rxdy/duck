import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { getAccountIdForToken, registerAccount } from "./auth.js";
import { db } from "./db.js";
import {
  countSpawns,
  deleteMapForAccount,
  listMapsForAccount,
  parseTiles,
  saveMapForAccount,
} from "./maps.js";
import { accounts } from "./schema.js";

// Test d'intégration contre une vraie base (voir db.test.ts pour le pourquoi).
// Les comptes créés sont supprimés à la fin ; les cartes partent avec eux
// (ON DELETE CASCADE, voir db/init/05-maps.sql).
const createdAccountIds: string[] = [];

afterAll(async () => {
  for (const id of createdAccountIds) {
    await db.delete(accounts).where(eq(accounts.id, id));
  }
});

async function freshAccount(): Promise<string> {
  const suffix = randomUUID().slice(0, 8);
  // registerAccount renvoie un token de session, pas l'id du compte : c'est
  // la session qui donne l'id, exactement comme le fait le serveur HTTP.
  const { token } = await registerAccount(
    `mapper-${suffix}`,
    `mapper-${suffix}@example.test`,
    "Motdepasse123!",
  );
  const accountId = (await getAccountIdForToken(token))!;
  createdAccountIds.push(accountId);
  return accountId;
}

function grid(width: number, height: number, spawns: string[] = []): string[][] {
  const tiles: string[][] = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) =>
      x === 0 || y === 0 || x === width - 1 || y === height - 1 ? "wall" : "empty",
    ),
  );
  spawns.forEach((kind, index) => {
    tiles[1]![index + 1] = kind;
  });
  return tiles;
}

describe("parseTiles", () => {
  it("accepte une grille bien formée", () => {
    expect(parseTiles(grid(7, 7), 7, 7)).toHaveLength(7);
  });

  it("refuse une grille dont les dimensions ne correspondent pas", () => {
    expect(parseTiles(grid(7, 7), 8, 7)).toBeUndefined();
    expect(parseTiles(grid(7, 7), 7, 8)).toBeUndefined();
  });

  it("refuse une case inconnue plutôt que de la stocker", () => {
    const tiles = grid(7, 7);
    tiles[3]![3] = "lave";
    expect(parseTiles(tiles, 7, 7)).toBeUndefined();
  });

  it("refuse une carte hors des tailles autorisées", () => {
    expect(parseTiles(grid(5, 5), 5, 5)).toBeUndefined();
    expect(parseTiles(grid(40, 7), 40, 7)).toBeUndefined();
  });

  it("refuse tout ce qui n'est pas une grille", () => {
    expect(parseTiles("pas une grille", 7, 7)).toBeUndefined();
    expect(parseTiles(null, 7, 7)).toBeUndefined();
  });
});

describe("countSpawns", () => {
  it("compte les couleurs posées, pas les cases", () => {
    expect(countSpawns(grid(9, 9, ["spawn-0", "spawn-2"]))).toBe(2);
    expect(countSpawns(grid(9, 9))).toBe(0);
  });
});

describe("saveMapForAccount", () => {
  it("enregistre une carte et la retrouve dans la liste du compte", async () => {
    const accountId = await freshAccount();

    const saved = await saveMapForAccount(accountId, {
      name: "  Ma carte  ",
      width: 9,
      height: 9,
      tiles: grid(9, 9, ["spawn-0", "spawn-1"]),
    });

    expect(saved).toMatchObject({ name: "Ma carte", width: 9, height: 9, spawnCount: 2 });
    expect(await listMapsForAccount(accountId)).toHaveLength(1);
  });

  it("met à jour la carte existante au lieu d'en créer une deuxième", async () => {
    const accountId = await freshAccount();
    const first = (await saveMapForAccount(accountId, {
      name: "V1",
      width: 9,
      height: 9,
      tiles: grid(9, 9, ["spawn-0"]),
    }))!;

    const updated = await saveMapForAccount(accountId, {
      id: first.id,
      name: "V2",
      width: 9,
      height: 9,
      tiles: grid(9, 9, ["spawn-0", "spawn-1", "spawn-2"]),
    });

    expect(updated).toMatchObject({ id: first.id, name: "V2", spawnCount: 3 });
    expect(await listMapsForAccount(accountId)).toHaveLength(1);
  });

  it("refuse d'écraser la carte d'un autre compte", async () => {
    const owner = await freshAccount();
    const intruder = await freshAccount();
    const map = (await saveMapForAccount(owner, {
      name: "Carte du propriétaire",
      width: 9,
      height: 9,
      tiles: grid(9, 9, ["spawn-0"]),
    }))!;

    // Connaître l'id d'une carte ne doit jamais suffire à la réécrire.
    const hijacked = await saveMapForAccount(intruder, {
      id: map.id,
      name: "Volée",
      width: 9,
      height: 9,
      tiles: grid(9, 9, ["spawn-0"]),
    });

    expect(hijacked).toBeUndefined();
    expect((await listMapsForAccount(owner))[0]!.name).toBe("Carte du propriétaire");
    expect(await listMapsForAccount(intruder)).toHaveLength(0);
  });

  it("refuse une grille invalide sans rien écrire", async () => {
    const accountId = await freshAccount();

    const saved = await saveMapForAccount(accountId, {
      name: "Cassée",
      width: 9,
      height: 9,
      tiles: [["wall"]],
    });

    expect(saved).toBeUndefined();
    expect(await listMapsForAccount(accountId)).toHaveLength(0);
  });

  it("nomme une carte sans nom plutôt que d'en accepter une anonyme", async () => {
    const accountId = await freshAccount();
    const saved = await saveMapForAccount(accountId, {
      name: "   ",
      width: 9,
      height: 9,
      tiles: grid(9, 9),
    });

    expect(saved!.name).toBe("Carte sans nom");
  });
});

describe("deleteMapForAccount", () => {
  it("supprime une carte du compte", async () => {
    const accountId = await freshAccount();
    const map = (await saveMapForAccount(accountId, {
      name: "À jeter",
      width: 9,
      height: 9,
      tiles: grid(9, 9),
    }))!;

    expect(await deleteMapForAccount(accountId, map.id)).toBe(true);
    expect(await listMapsForAccount(accountId)).toHaveLength(0);
  });

  it("ne supprime pas la carte de quelqu'un d'autre", async () => {
    const owner = await freshAccount();
    const intruder = await freshAccount();
    const map = (await saveMapForAccount(owner, {
      name: "Protégée",
      width: 9,
      height: 9,
      tiles: grid(9, 9),
    }))!;

    expect(await deleteMapForAccount(intruder, map.id)).toBe(false);
    expect(await listMapsForAccount(owner)).toHaveLength(1);
  });
});

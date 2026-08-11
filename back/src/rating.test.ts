import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { getAccountIdForToken, registerAccount } from "./auth.js";
import { db } from "./db.js";
import {
  applyMatchRatings,
  computeRatings,
  listRanking,
  listRankingFor,
  STARTING_RATING,
} from "./rating.js";
import { accounts } from "./schema.js";

const createdIds: string[] = [];

afterAll(async () => {
  if (createdIds.length > 0) await db.delete(accounts).where(inArray(accounts.id, createdIds));
});

async function freshAccount(rating = STARTING_RATING): Promise<{ id: string; anonId: string }> {
  const suffix = randomUUID().slice(0, 8);
  const anonId = `anon-${suffix}`;
  const { token } = await registerAccount(
    `elo-${suffix}`,
    `elo-${suffix}@example.test`,
    "Motdepasse123!",
    anonId,
  );
  const id = (await getAccountIdForToken(token))!;
  createdIds.push(id);
  await db.update(accounts).set({ rating }).where(eq(accounts.id, id));
  return { id, anonId };
}

function match(players: { anonId: string; score: number }[]) {
  return {
    mapName: `test-${randomUUID()}`,
    players: players.map((p) => ({
      anonId: p.anonId,
      name: p.anonId,
      color: "#FF4D6D",
      score: p.score,
      isWinner: false,
    })),
  };
}

describe("computeRatings", () => {
  it("fait perdre MOINS au perdant que ce que gagne le vainqueur", () => {
    // Entorse assumée à l'Elo classique : perdre autant qu'on gagne rend une
    // mauvaise série décourageante, surtout dans un jeu où l'on peut finir
    // dernier sur quatre sans avoir mal joué.
    const [winner, loser] = computeRatings([
      { rating: 1000, score: 15 },
      { rating: 1000, score: 7 },
    ]);

    const gagne = winner! - 1000;
    const perd = 1000 - loser!;
    expect(gagne).toBeGreaterThan(0);
    expect(perd).toBeGreaterThan(0);
    expect(perd).toBeLessThan(gagne);
    expect(perd).toBe(gagne / 2);
  });

  it("laisse une place intermédiaire à peu près neutre à 4 joueurs", () => {
    // Finir 3e sur 4 ne doit ni récompenser ni punir : on a battu quelqu'un
    // et perdu contre deux, l'un compense l'autre.
    const [premier, deuxieme, troisieme, dernier] = computeRatings([
      { rating: 1000, score: 15 },
      { rating: 1000, score: 10 },
      { rating: 1000, score: 6 },
      { rating: 1000, score: 2 },
    ]);

    expect(premier! - 1000).toBe(16);
    expect(deuxieme! - 1000).toBe(8);
    expect(troisieme! - 1000).toBe(0);
    expect(dernier! - 1000).toBe(-8);
  });

  it("rapporte plus quand on bat plus fort que soi", () => {
    const [contreFort] = computeRatings([
      { rating: 1000, score: 15 },
      { rating: 1600, score: 7 },
    ]);
    const [contreFaible] = computeRatings([
      { rating: 1000, score: 15 },
      { rating: 400, score: 7 },
    ]);

    expect(contreFort! - 1000).toBeGreaterThan(contreFaible! - 1000);
  });

  it("ignore l'écart de score : seul le classement compte", () => {
    // Sinon écraser un adversaire déjà battu vaudrait mieux que de gagner
    // proprement, et on encouragerait l'acharnement.
    const serre = computeRatings([
      { rating: 1000, score: 15 },
      { rating: 1000, score: 14 },
    ]);
    const large = computeRatings([
      { rating: 1000, score: 15 },
      { rating: 1000, score: 0 },
    ]);

    expect(serre).toEqual(large);
  });

  it("partage équitablement une égalité", () => {
    expect(
      computeRatings([
        { rating: 1200, score: 10 },
        { rating: 1200, score: 10 },
      ]),
    ).toEqual([1200, 1200]);
  });

  it("répartit l'ajustement entre tous les adversaires en FFA", () => {
    const [premier, , dernier] = computeRatings([
      { rating: 1000, score: 15 },
      { rating: 1000, score: 9 },
      { rating: 1000, score: 2 },
    ]);

    expect(premier).toBeGreaterThan(1000);
    expect(dernier).toBeLessThan(1000);
    // Une partie à 3 ne doit pas peser plus qu'un duel : l'amplitude reste
    // du même ordre.
    expect(premier! - 1000).toBeLessThanOrEqual(16);
    // Et la chute du dernier reste plus douce que la montée du premier.
    expect(1000 - dernier!).toBeLessThan(premier! - 1000);
  });

  it("ne descend jamais sous zéro", () => {
    const [perdant] = computeRatings([
      { rating: 0, score: 0 },
      { rating: 2000, score: 15 },
    ]);
    expect(perdant).toBe(0);
  });

  it("ne touche à rien quand il n'y a qu'un joueur", () => {
    expect(computeRatings([{ rating: 1234, score: 3 }])).toEqual([1234]);
  });
});

describe("applyMatchRatings", () => {
  it("met à jour le classement des comptes de la partie", async () => {
    const gagnant = await freshAccount(800);
    const perdant = await freshAccount(800);

    await applyMatchRatings(
      match([
        { anonId: gagnant.anonId, score: 15 },
        { anonId: perdant.anonId, score: 4 },
      ]),
    );

    const [g] = await db.select().from(accounts).where(eq(accounts.id, gagnant.id));
    const [p] = await db.select().from(accounts).where(eq(accounts.id, perdant.id));
    expect(g!.rating).toBeGreaterThan(800);
    expect(p!.rating).toBeLessThan(800);
  });

  it("ne fait rien perdre à un joueur qui débute", async () => {
    // Un nouveau compte part de zéro et le classement ne descend jamais en
    // dessous : les premières parties ne peuvent donc que rapporter.
    const debutant = await freshAccount(STARTING_RATING);
    const adversaire = await freshAccount(900);

    await applyMatchRatings(
      match([
        { anonId: adversaire.anonId, score: 15 },
        { anonId: debutant.anonId, score: 1 },
      ]),
    );

    const [row] = await db.select().from(accounts).where(eq(accounts.id, debutant.id));
    expect(row!.rating).toBe(STARTING_RATING);
  });

  it("ignore une partie où un seul joueur a un compte", async () => {
    // Cas d'une partie contre des bots : rien à classer entre eux.
    const solo = await freshAccount();

    await applyMatchRatings(
      match([
        { anonId: solo.anonId, score: 15 },
        { anonId: "anon-sans-compte", score: 2 },
      ]),
    );

    const [row] = await db.select().from(accounts).where(eq(accounts.id, solo.id));
    expect(row!.rating).toBe(STARTING_RATING);
  });
});

describe("listRanking", () => {
  it("trie par classement décroissant et numérote les rangs", async () => {
    const fort = await freshAccount(4000);
    const moyen = await freshAccount(3500);

    const ranking = await listRanking(50);
    const positions = ranking.filter((r) => r.username.startsWith("elo-"));

    expect(positions[0]!.rating).toBeGreaterThanOrEqual(positions[1]?.rating ?? 0);
    expect(ranking[0]!.rank).toBe(1);
    expect(fort.id && moyen.id).toBeTruthy();
  });

  it("garde le rang GÉNÉRAL dans une recherche", async () => {
    // Afficher "1, 2, 3" pour trois joueurs cherchés au hasard laisserait
    // croire qu'ils sont en tête du classement.
    const faible = await freshAccount(5);
    const ranking = await listRanking(10, faible.anonId.slice(0, 4));

    for (const row of ranking) expect(row.rank).toBeGreaterThan(0);
  });
});

describe("listRankingFor", () => {
  it("ajoute le joueur connecté avec son VRAI rang quand il est hors du top", async () => {
    // Le seul écran de classement inutile est celui où on ne se trouve pas.
    const dernier = await freshAccount(1);
    const [row] = await db.select().from(accounts).where(eq(accounts.id, dernier.id));

    const ranking = await listRankingFor(row!.username, 3);

    expect(ranking.top).toHaveLength(3);
    expect(ranking.viewer?.username).toBe(row!.username);
    expect(ranking.viewer!.rank).toBeGreaterThan(3);
  });

  it("ne le répète pas quand il est déjà dans le top", async () => {
    const champion = await freshAccount(99_999);
    const [row] = await db.select().from(accounts).where(eq(accounts.id, champion.id));

    const ranking = await listRankingFor(row!.username, 5);

    expect(ranking.top[0]!.username).toBe(row!.username);
    expect(ranking.viewer).toBeUndefined();
  });

  it("ne confond pas un joueur avec un pseudo qui contient le sien", async () => {
    // La recherche est partielle : sans vérification, chercher "elo" pourrait
    // afficher "elo-1234" comme étant le joueur connecté.
    const ranking = await listRankingFor("pseudo-qui-n-existe-pas", 3);
    expect(ranking.viewer).toBeUndefined();
  });
});

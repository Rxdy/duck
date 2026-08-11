import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { BOT_LEVELS, type BotLevel } from "./bots.js";
import {
  BOT_ROLE,
  botUsernames,
  ensureBotPopulation,
  levelForRating,
  levelOf,
  pickBotOpponents,
  planPopulation,
  quotaPerLevel,
} from "./botAccounts.js";
import { db } from "./db.js";
import { accounts } from "./schema.js";

/**
 * La population de bots est PARTAGÉE avec le serveur de développement : ces
 * tests ne doivent supprimer que ce qu'ils ont eux-mêmes créé. On relève donc
 * l'existant avant de commencer, et on ne nettoie que la différence — sans
 * ça, lancer la suite viderait la population du jeu.
 */
let preexisting = new Set<string>();

beforeAll(async () => {
  const rows = await db.select().from(accounts).where(eq(accounts.role, BOT_ROLE));
  preexisting = new Set(rows.map((r) => r.id));
});

afterAll(async () => {
  const rows = await db.select().from(accounts).where(eq(accounts.role, BOT_ROLE));
  const mine = rows.map((r) => r.id).filter((id) => !preexisting.has(id));
  if (mine.length > 0) await db.delete(accounts).where(inArray(accounts.id, mine));
});

describe("botUsernames", () => {
  it("génère des pseudos uniques, en quantité", () => {
    const names = botUsernames(150);
    expect(names).toHaveLength(150);
    expect(new Set(names).size).toBe(150);
  });

  it("ne pioche jamais dans les prénoms ni les pseudos qu'un joueur voudrait", () => {
    // Refuser "son" nom à quelqu'un qui s'inscrit, parce qu'un bot l'occupe,
    // serait la pire première impression possible.
    const interdits = ["rudy", "alex", "marie", "lucas", "sarah", "deeps", "duck", "admin"];
    const names = botUsernames(200).map((n) => n.toLowerCase());
    for (const interdit of interdits) expect(names).not.toContain(interdit);
  });

  it("produit la même liste d'une exécution à l'autre", () => {
    // Sinon relancer le serveur recréerait une population entièrement neuve.
    expect(botUsernames(40)).toEqual(botUsernames(40));
  });

  it("ne met pas tous les pseudos d'une même famille en tête", () => {
    const familles = new Set(botUsernames(12).map((n) => n.slice(0, 4)));
    expect(familles.size).toBeGreaterThan(6);
  });
});

describe("levelForRating", () => {
  it("associe chaque niveau à son propre classement de référence", () => {
    for (const [name, level] of Object.entries(BOT_LEVELS)) {
      expect(levelForRating(level.rating)).toBe(name);
    }
  });

  it("place un classement intermédiaire au niveau de référence le plus proche", () => {
    expect(levelForRating(150)).toBe("debutant");
    expect(levelForRating(1500)).toBe("expert");
    expect(levelForRating(2000)).toBe("impossible");
  });
});

describe("levelOf", () => {
  it("prend le niveau du compte, quel que soit son classement", () => {
    // Le cœur du correctif : un bot débutant qui grimpe à 1800 reste un
    // débutant. Son intelligence est une propriété de lui, pas de son score —
    // sinon le battre le rendrait meilleur, et le classement mesurerait une
    // grandeur qui bouge avec la mesure.
    expect(levelOf({ level: "debutant", rating: 1800 })).toBe("debutant");
    expect(levelOf({ level: "impossible", rating: 0 })).toBe("impossible");
  });

  it("retombe sur la déduction quand le compte n'a pas de niveau", () => {
    // Bot enregistré avant db/init/11-bot-level.sql, script de reprise pas
    // encore joué : mieux vaut l'ancien comportement que pas de bot du tout.
    expect(levelOf({ level: null, rating: 1400 })).toBe("expert");
    expect(levelOf({ level: "n'importe quoi", rating: 200 })).toBe("debutant");
  });
});

describe("planPopulation", () => {
  const bot = (level: BotLevel | null, rating = 0) => ({ level, rating });
  const SANS_SOMMET: BotLevel[] = ["debutant", "intermediaire", "confirme", "expert"];

  it("part d'une base vierge en couvrant toute l'échelle, sommet compris", () => {
    const plan = planPopulation([], 10);
    expect(plan).toHaveLength(10);
    expect(new Set(plan)).toEqual(new Set(Object.keys(BOT_LEVELS)));
  });

  it("ne crée rien quand chaque niveau a son quota", () => {
    const full = Object.keys(BOT_LEVELS).flatMap((level) =>
      [0, 1].map(() => bot(level as BotLevel)),
    );
    expect(planPopulation(full, 10)).toEqual([]);
  });

  it("comble un niveau absent même quand le total y est déjà", () => {
    // LE bug : une population née à quatre niveaux restait à quatre niveaux
    // pour toujours, parce que le compte TOTAL y était. Le sommet du
    // classement plafonnait donc à celui des experts (1540 en pratique, jitter
    // compris), et ajouter « impossible » n'y changeait rien.
    const existing = Array.from({ length: 20 }, (_, i) => bot(SANS_SOMMET[i % 4]!));

    expect(planPopulation(existing, 20)).toEqual(Array<BotLevel>(4).fill("impossible"));
  });

  it("ne déclasse jamais un bot en surnombre pour tenir un total", () => {
    // Un bot a un pseudo, un historique et une place au classement. Les
    // rétrograder pour arrondir la population coûterait tout ça pour un
    // chiffre rond : la population grandit, c'est moins cher.
    const existing = Array.from({ length: 40 }, (_, i) => bot(SANS_SOMMET[i % 4]!));
    const plan = planPopulation(existing, 20);

    expect(plan.every((level) => level === "impossible")).toBe(true);
  });

  it("compte un bot sans niveau au niveau déduit de son classement", () => {
    // Bot enregistré avant db/init/11-bot-level.sql : il compte déjà pour son
    // niveau, sinon on lui créerait un doublon à chaque démarrage.
    const orphelins = Array.from({ length: 4 }, () => bot(null, BOT_LEVELS.expert.rating));
    const plan = planPopulation(orphelins, 20);

    expect(plan.filter((level) => level === "expert")).toEqual([]);
  });

  it("donne le reste de la division aux niveaux les plus faibles", () => {
    // C'est là que sont les joueurs, donc là où le matchmaking a besoin de
    // choix.
    const quota = quotaPerLevel(12);
    expect(quota.debutant).toBe(3);
    expect(quota.intermediaire).toBe(3);
    expect(quota.impossible).toBe(2);
    expect(Object.values(quota).reduce((a, b) => a + b, 0)).toBe(12);
  });
});

async function botRows() {
  return db
    .select()
    .from(accounts)
    .where(inArray(accounts.role, [BOT_ROLE]));
}

describe("ensureBotPopulation", () => {
  /** Quota strictement au-dessus du niveau le plus peuplé : il reste toujours
   * quelque chose à créer, quel que soit l'état de la population de dev. */
  async function targetAboveExisting() {
    const counts = new Map<string, number>();
    for (const bot of await botRows()) {
      const level = levelOf(bot);
      counts.set(level, (counts.get(level) ?? 0) + 1);
    }
    const quota = Math.max(0, ...counts.values()) + 1;
    return { quota, target: quota * Object.keys(BOT_LEVELS).length };
  }

  it("amène chaque niveau à son quota, puis ne recrée rien", async () => {
    const { quota, target } = await targetAboveExisting();

    expect(await ensureBotPopulation(target)).toBeGreaterThan(0);

    const after = await botRows();
    for (const level of Object.keys(BOT_LEVELS)) {
      expect(after.filter((bot) => levelOf(bot) === level).length, level).toBeGreaterThanOrEqual(
        quota,
      );
    }

    // Idempotent : c'est ce qui permet de l'appeler à chaque démarrage.
    expect(await ensureBotPopulation(target)).toBe(0);
  });

  it("peuple le sommet de l'échelle, pas seulement le milieu", async () => {
    // Le symptôme d'origine : aucun bot au-delà de ~1540, donc un classement
    // dont la tête était un plafond de verre.
    const { target } = await targetAboveExisting();
    await ensureBotPopulation(target);

    const bots = await botRows();
    expect(bots.some((bot) => bot.level === "impossible")).toBe(true);
    expect(Math.max(...bots.map((bot) => bot.rating))).toBeGreaterThan(1540);
  });

  it("donne à chaque bot un identifiant anonyme et un niveau", async () => {
    // L'identifiant anonyme relie une partie au compte : sans lui, ni
    // statistiques ni classement (voir rating.ts#applyMatchRatings). Le niveau
    // est son intelligence, et elle ne se déduit plus de son score.
    const bots = await botRows();
    expect(bots.length).toBeGreaterThan(0);
    for (const bot of bots) {
      expect(bot.anonId).toBeTruthy();
      expect(bot.level, bot.username).toBeTruthy();
    }
  });
});

describe("pickBotOpponents", () => {
  it("choisit des adversaires proches du classement demandé", async () => {
    await ensureBotPopulation(20);
    const faibles = await pickBotOpponents(200, 3);
    const forts = await pickBotOpponents(1400, 3);

    const moyenne = (list: { rating: number }[]) =>
      list.reduce((sum, b) => sum + b.rating, 0) / list.length;
    expect(moyenne(faibles)).toBeLessThan(moyenne(forts));
  });

  it("ne renvoie jamais deux fois le même adversaire", async () => {
    const picked = await pickBotOpponents(1000, 3);
    expect(new Set(picked.map((b) => b.username)).size).toBe(picked.length);
  });

  it("ne demande rien quand la partie n'a pas de place à combler", async () => {
    expect(await pickBotOpponents(1000, 0)).toEqual([]);
  });

  it("sert le niveau du COMPTE, pas celui que suggère son classement", async () => {
    // Le correctif, vu du matchmaking. Ces bots sont classés tout en haut mais
    // restent des débutants : leur classement dit ce qu'ils ont réussi, leur
    // niveau dit comment ils jouent. L'ancienne déduction en aurait fait des
    // « impossible » — un joueur qui bat un bot le rendait plus fort.
    // Douze : de quoi remplir à eux seuls le vivier que consulte
    // pickBotOpponents pour trois sièges (count * 4), sinon un vrai bot de la
    // population s'y glisse et le test mesure autre chose.
    const grimpeurs = Array.from({ length: 12 }, (_, i) => ({
      username: `TestGrimpeur${i}`,
      email: `testgrimpeur${i}@bots.invalid`,
      passwordHash: `bot:test-${i}`,
      anonId: `bot-test-grimpeur-${i}`,
      rating: 9000 + i,
      role: BOT_ROLE,
      level: "debutant",
    }));
    await db.insert(accounts).values(grimpeurs).onConflictDoNothing();

    const picked = await pickBotOpponents(9000, 3);
    expect(picked.length).toBeGreaterThan(0);
    for (const bot of picked) {
      expect(bot.level, bot.username).toBe("debutant");
      expect(bot.rating).toBeGreaterThan(1800);
    }
  });
});

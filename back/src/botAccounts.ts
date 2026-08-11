import { randomUUID } from "node:crypto";
import { asc, eq, sql } from "drizzle-orm";
import { BOT_LEVELS, isBotLevel, type BotLevel } from "./bots.js";
import { db } from "./db.js";
import { accounts } from "./schema.js";

/**
 * Les bots sont des comptes à part entière : même table, même Elo, mêmes
 * parties enregistrées, même classement. Ce n'est pas une coquetterie —
 * c'est ce qui leur donne une vie statistique sans écrire une seule ligne de
 * code en double, et ce qui rend impossible de les repérer dans l'interface.
 *
 * Un joueur seul doit trouver une partie tout de suite, et ne pas voir qu'il
 * l'a trouvée contre une machine.
 */
export const BOT_ROLE = "bot";

/**
 * Taille de la population. Une poignée de bots ne donne pas l'impression
 * d'un jeu habité : on en veut assez pour qu'un joueur ne recroise pas le
 * même adversaire deux soirs de suite.
 */
export const BOT_POPULATION = 120;

/**
 * Vocabulaire des pseudos : canard, plateau, mouvement. **Aucun prénom, aucun
 * pseudo qu'un humain pourrait vouloir** — refuser "son" nom à quelqu'un qui
 * s'inscrit parce qu'un bot l'occupe serait la pire première impression
 * possible.
 */
const NOUNS = [
  "Plume",
  "Bec",
  "Aile",
  "Palme",
  "Duvet",
  "Colvert",
  "Eider",
  "Roseau",
  "Nenuphar",
  "Etang",
  "Mare",
  "Ricochet",
  "Sillage",
  "Couloir",
  "Dalle",
  "Pave",
  "Case",
  "Bordure",
  "Diagonale",
  "Virage",
  "Cadence",
  "Elan",
  "Foulee",
  "Remous",
  "Courant",
  "Tourbillon",
  "Berge",
  "Vasque",
  "Crete",
  "Gravier",
];

const QUALIFIERS = [
  "Vif",
  "Agile",
  "Rapide",
  "Furtif",
  "Tetu",
  "Malin",
  "Fuyant",
  "Tranquille",
  "Tenace",
  "Sournois",
  "Patient",
  "Presse",
  "Nerveux",
  "Placide",
  "Vorace",
];

/**
 * Pseudos possibles, dans un ordre mélangé mais STABLE : deux exécutions
 * produisent la même liste, donc relancer le serveur ne recrée pas une
 * population entièrement différente.
 */
export function botUsernames(count: number): string[] {
  const all: string[] = [];
  for (const noun of NOUNS) {
    for (const qualifier of QUALIFIERS) all.push(`${noun}${qualifier}`);
  }
  // Mélange déterministe : on parcourt la liste par pas premier, ce qui
  // évite d'aligner tous les "Plume*" en tête sans dépendre du hasard.
  const step = 137;
  const picked: string[] = [];
  for (let i = 0; picked.length < Math.min(count, all.length); i++) {
    picked.push(all[(i * step) % all.length]!);
  }
  return picked;
}

export const BOT_LEVEL_ORDER = Object.keys(BOT_LEVELS) as BotLevel[];

/**
 * Niveau déduit d'un classement : celui dont l'Elo de référence est le plus
 * proche.
 *
 * **Ce n'est plus le niveau d'un bot**, seulement une valeur de repli. Le
 * niveau est une propriété du compte (`accounts.level`, voir
 * db/init/11-bot-level.sql), fixée à la création et jamais réécrite : un bot a
 * une intelligence, il la garde. La déduire du classement revenait à lui
 * changer le cerveau à chaque victoire — un adversaire qu'on bat et qui
 * devient meilleur pour cette raison-là n'apprend rien à personne, et un
 * classement dont le mesuré bouge avec la mesure ne mesure plus rien.
 *
 * Reste utile pour un bot enregistré avant que la colonne existe, si le script
 * de reprise n'a pas encore été joué.
 */
export function levelForRating(rating: number): BotLevel {
  return BOT_LEVEL_ORDER.reduce((best, level) =>
    Math.abs(BOT_LEVELS[level].rating - rating) < Math.abs(BOT_LEVELS[best].rating - rating)
      ? level
      : best,
  );
}

/** Niveau stocké d'un compte, ou celui déduit de son classement à défaut. */
export function levelOf(account: { level: string | null; rating: number }): BotLevel {
  return isBotLevel(account.level) ? account.level : levelForRating(account.rating);
}

/**
 * Nombre de bots visé PAR NIVEAU. Le reste de la division va aux niveaux les
 * plus faibles : c'est là que se trouvent la plupart des joueurs, donc là que
 * le matchmaking a le plus besoin de choix.
 */
export function quotaPerLevel(target: number): Record<BotLevel, number> {
  const base = Math.floor(target / BOT_LEVEL_ORDER.length);
  const remainder = target % BOT_LEVEL_ORDER.length;
  return Object.fromEntries(
    BOT_LEVEL_ORDER.map((level, index) => [level, base + (index < remainder ? 1 : 0)]),
  ) as Record<BotLevel, number>;
}

/**
 * Les niveaux à créer pour que la population couvre TOUTE l'échelle : un
 * élément par bot manquant. Fonction pure, testable sans base — c'est elle qui
 * décide, la base ne fait qu'exécuter.
 *
 * Le « compléter jusqu'à N » d'avant avait un défaut qu'on ne voyait qu'après
 * coup : il ne comptait que le TOTAL. Une population née à quatre niveaux
 * restait donc à quatre niveaux pour toujours, même après l'ajout d'un
 * cinquième — le compte y était, rien n'était créé. Le haut du classement
 * plafonnait net au sommet des experts (1540 en pratique, jitter compris), et
 * ajouter le niveau « impossible » n'y changeait rien tant qu'on ne repartait
 * pas d'une base vierge.
 *
 * D'où le comptage par NIVEAU. `target` est donc un ordre de grandeur, pas un
 * plafond : un niveau ajouté fait grandir la population d'un quota, et des
 * bots déjà en surnombre à leur niveau y restent. On ne déclasse jamais un bot
 * existant pour tenir un total — il a un pseudo, un historique et une place au
 * classement, tout ça pour un chiffre rond.
 */
export function planPopulation(
  existing: { level: string | null; rating: number }[],
  target: number,
): BotLevel[] {
  const quota = quotaPerLevel(target);
  const counts = new Map<BotLevel, number>(BOT_LEVEL_ORDER.map((level) => [level, 0]));
  for (const account of existing) {
    const level = levelOf(account);
    counts.set(level, counts.get(level)! + 1);
  }

  return BOT_LEVEL_ORDER.flatMap((level) =>
    Array<BotLevel>(Math.max(0, quota[level] - counts.get(level)!)).fill(level),
  );
}

/**
 * Complète la population de bots pour que chaque niveau ait son quota (voir
 * planPopulation). Idempotent : relancer le serveur ne crée rien de plus une
 * fois l'échelle couverte. Renvoie le nombre de comptes créés.
 *
 * Best-effort — un serveur de jeu doit démarrer même sans base (voir db.ts).
 */
export async function ensureBotPopulation(target = BOT_POPULATION): Promise<number> {
  const existing = await db.select().from(accounts).where(eq(accounts.role, BOT_ROLE));
  const missing = planPopulation(existing, target);
  if (missing.length === 0) return 0;

  const taken = new Set(existing.map((a) => a.username.toLowerCase()));
  const candidates = botUsernames(target * 2 + missing.length).filter(
    (name) => !taken.has(name.toLowerCase()),
  );
  const rows = missing.slice(0, candidates.length).map((level, index) => ({
    username: candidates[index]!,
    // Adresse et mot de passe inutilisables : un bot ne se connecte jamais,
    // ces colonnes existent pour les humains.
    email: `${candidates[index]!.toLowerCase()}@bots.invalid`,
    passwordHash: `bot:${randomUUID()}`,
    // Même identifiant anonyme que les humains : c'est lui qui relie une
    // partie enregistrée à un compte (voir rating.ts#applyMatchRatings), donc
    // les statistiques et le classement des bots marchent sans code dédié.
    anonId: `bot-${randomUUID()}`,
    // Classement de DÉPART seulement : il bouge ensuite avec les résultats,
    // sans jamais toucher au niveau ci-dessous.
    rating: jitteredRating(BOT_LEVELS[level].rating, existing.length + index),
    role: BOT_ROLE,
    level,
  }));

  if (rows.length === 0) return 0;
  await db.insert(accounts).values(rows).onConflictDoNothing();
  return rows.length;
}

/**
 * Écart maximal appliqué au classement de départ d'un bot.
 *
 * Sans ce bruit, les 120 bots se répartissent sur CINQ valeurs exactes (200,
 * 600, 1000, 1400, 1800) : un classement où vingt-quatre joueurs partagent le
 * même score au point près se lit immédiatement comme fabriqué. Le bruit reste
 * déterministe — même population d'une exécution à l'autre.
 *
 * Il ne s'applique qu'au classement de DÉPART. Ensuite le bot est classé par
 * ses résultats comme n'importe qui, sans plancher ni plafond : c'est ce qui
 * fait vivre le haut du tableau.
 */
const RATING_JITTER = 140;

function jitteredRating(base: number, seed: number): number {
  // Générateur simple et reproductible : deux exécutions donnent la même
  // population, ce qui évite de recréer un serveur entièrement différent à
  // chaque redémarrage.
  const pseudoRandom = Math.abs(Math.sin(seed * 12.9898) * 43758.5453) % 1;
  const offset = Math.round((pseudoRandom * 2 - 1) * RATING_JITTER);
  return Math.max(50, base + offset);
}

export interface BotOpponent {
  username: string;
  anonId: string;
  level: BotLevel;
  rating: number;
}

/**
 * Adversaire artificiel dont le classement est le plus proche de `rating`,
 * choisi au hasard parmi les quelques plus proches — sinon un joueur donné
 * retomberait toujours sur le même bot. `exclude` évite de servir deux fois
 * le même dans une partie à trois ou quatre.
 */
export async function pickBotOpponents(rating: number, count: number): Promise<BotOpponent[]> {
  if (count <= 0) return [];

  const pool = await db
    .select()
    .from(accounts)
    .where(eq(accounts.role, BOT_ROLE))
    .orderBy(asc(sql`abs(${accounts.rating} - ${rating})`))
    .limit(Math.max(count * 4, 8));

  const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, count);
  return shuffled.map((bot) => ({
    username: bot.username,
    anonId: bot.anonId ?? `bot-${bot.id}`,
    // Le niveau du COMPTE, pas une déduction de son classement : c'est son
    // intelligence, elle ne change pas parce qu'il vient de gagner.
    level: levelOf(bot),
    rating: bot.rating,
  }));
}

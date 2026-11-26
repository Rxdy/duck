import { eq, inArray, sql } from "drizzle-orm";
import { db } from "./db.js";
import { accounts, matches } from "./schema.js";
import { publicOutfit } from "./catalog.js";
import type { MatchResult } from "./db.js";

/**
 * Classement de départ d'un nouveau compte : **zéro**.
 *
 * Combiné au plancher à zéro plus bas, ça donne une entrée sans risque —
 * un joueur qui débute ne peut rien perdre tant qu'il n'a rien gagné, et voit
 * son score monter dès sa première victoire. C'est aussi ce qui l'oriente
 * vers les adversaires les plus faibles au matchmaking (voir
 * botAccounts.ts#pickBotOpponents), puisque celui-ci choisit par proximité
 * de classement.
 */
export const STARTING_RATING = 0;

/**
 * Amplitude maximale d'un ajustement. 32 est la valeur classique : assez pour
 * que quelques parties déplacent visiblement un joueur, assez peu pour qu'une
 * mauvaise soirée ne détruise pas des semaines.
 */
const K_FACTOR = 32;

export interface RatedPlayer {
  rating: number;
  score: number;
  /** Un adversaire artificiel : l'échange de points contre lui est réduit. */
  isBot?: boolean;
}

/**
 * Une victoire contre un bot rapporte MOITIÉ moins. Sans ça, la façon la plus
 * rapide de monter au classement serait d'enchaîner les parties contre le bot
 * le plus faible qu'on puisse trouver — et un classement qu'on monte en
 * évitant les humains ne veut plus rien dire.
 */
const BOT_K_RATIO = 0.5;

/**
 * Une défaite ne coûte que la MOITIÉ de ce qu'une victoire équivalente
 * rapporterait.
 *
 * C'est une entorse assumée à l'Elo classique, qui est à somme nulle. Le but
 * n'est pas de mesurer un niveau au point près mais de donner envie de
 * rejouer : perdre autant qu'on gagne rend une mauvaise série décourageante,
 * surtout dans un jeu où l'on peut finir dernier sur quatre sans avoir mal
 * joué. Le coût de ce choix est une inflation lente — le classement moyen
 * monte avec le temps, donc un score n'est comparable qu'entre joueurs
 * actuels, pas d'une année sur l'autre.
 */
const LOSS_DAMPENING = 0.5;

/**
 * Nouveau classement de chaque joueur après une partie.
 *
 * Chaque paire de joueurs est traitée comme un duel — c'est ce qui rend la
 * formule valable en FFA sans rien inventer : finir devant un joueur mieux
 * classé rapporte plus que finir devant un débutant, et l'ajustement est
 * divisé par le nombre d'adversaires pour qu'une partie à 4 ne pèse pas trois
 * fois une partie à 2.
 *
 * Le score exact ne compte pas, seul le CLASSEMENT compte : gagner 15-14 ou
 * 15-0 rapporte pareil. Sinon écraser un adversaire déjà battu vaudrait mieux
 * que de gagner proprement, et on encouragerait l'acharnement.
 */
export function computeRatings(players: RatedPlayer[]): number[] {
  if (players.length < 2) return players.map((p) => p.rating);

  return players.map((player, index) => {
    let delta = 0;
    for (let other = 0; other < players.length; other++) {
      if (other === index) continue;
      const opponent = players[other]!;
      const expected = 1 / (1 + 10 ** ((opponent.rating - player.rating) / 400));
      const actual = player.score > opponent.score ? 1 : player.score === opponent.score ? 0.5 : 0;
      const k = player.isBot || opponent.isBot ? K_FACTOR * BOT_K_RATIO : K_FACTOR;
      const duel = (k / (players.length - 1)) * (actual - expected);
      delta += duel < 0 ? duel * LOSS_DAMPENING : duel;
    }
    // Arrondi vers l'entier le plus proche, jamais en dessous de zéro : un
    // classement négatif ne veut rien dire pour un joueur.
    return Math.max(0, Math.round(player.rating + delta));
  });
}

/**
 * Applique le classement d'une partie terminée aux comptes concernés.
 *
 * Best-effort, comme l'enregistrement de la partie : une base indisponible ne
 * doit jamais empêcher d'annoncer la fin de partie. Les joueurs sans compte
 * (anonymes, bots) sont simplement ignorés — ils n'ont rien à classer, et le
 * classement des autres est calculé entre eux seuls.
 */
export async function applyMatchRatings(result: MatchResult): Promise<void> {
  const anonIds = result.players
    .map((p) => p.anonId)
    .filter((id): id is string => typeof id === "string");
  if (anonIds.length < 2) return;

  const rows = await db.select().from(accounts).where(inArray(accounts.anonId, anonIds));
  if (rows.length < 2) return;

  const rated = rows.map((account) => ({
    id: account.id,
    rating: account.rating,
    isBot: account.role === "bot",
    score: result.players.find((p) => p.anonId === account.anonId)?.score ?? 0,
  }));

  const updated = computeRatings(rated);
  await Promise.all(
    rated.map((player, index) =>
      db.update(accounts).set({ rating: updated[index]! }).where(eq(accounts.id, player.id)),
    ),
  );
}

/**
 * Classement qu'un invité aurait atteint avec les parties jouées avant son
 * inscription, rejouées dans l'ordre. Le classement de ses adversaires à
 * l'époque n'est pas conservé : on prend l'actuel, et on ne le modifie pas.
 */
export async function replayRating(anonId: string): Promise<number> {
  const played = await db
    .select({ players: matches.players })
    .from(matches)
    .where(sql`${matches.players} @> ${JSON.stringify([{ anonId }])}::jsonb`)
    .orderBy(matches.playedAt);
  if (played.length === 0) return STARTING_RATING;

  const results = played.map((row) => row.players as MatchResult["players"]);
  const opponentIds = [
    ...new Set(
      results
        .flat()
        .map((p) => p.anonId)
        .filter((id): id is string => typeof id === "string" && id !== anonId),
    ),
  ];
  const rows = opponentIds.length
    ? await db.select().from(accounts).where(inArray(accounts.anonId, opponentIds))
    : [];
  const opponents = new Map(rows.map((account) => [account.anonId, account]));

  return results.reduce((rating, players) => {
    const me = players.find((p) => p.anonId === anonId)!;
    const rated = players.flatMap((p) => {
      const account = opponents.get(p.anonId);
      return account
        ? [{ rating: account.rating, score: p.score, isBot: account.role === "bot" }]
        : [];
    });
    return computeRatings([{ rating, score: me.score }, ...rated])[0]!;
  }, STARTING_RATING);
}

export interface RankedAccount {
  rank: number;
  username: string;
  tag: string;
  rating: number;
  /** Ce que porte son canard, montré au classement. */
  outfit: string[];
}

export interface Ranking {
  top: RankedAccount[];
  /**
   * Le joueur qui regarde, quand il ne figure PAS dans la liste renvoyée.
   * L'afficher à part, avec son vrai rang, évite le seul écran de classement
   * qui ne sert à rien : celui où on ne se trouve pas.
   */
  viewer?: RankedAccount;
}

/** Tous les comptes avec leur rang général. */
function rankedAccounts() {
  return db
    .select({
      username: accounts.username,
      tag: accounts.tag,
      rating: accounts.rating,
      outfit: accounts.outfit,
      rank: sql<number>`rank() over (order by ${accounts.rating} desc, ${accounts.username})`.as(
        "rank",
      ),
    })
    .from(accounts)
    .as("ranked");
}

/**
 * Classement général. `search` filtre par pseudo (recherche partielle,
 * insensible à la casse) ; sans lui, on renvoie simplement les meilleurs.
 *
 * Le rang est celui du classement GÉNÉRAL, même dans une recherche : afficher
 * "1, 2, 3" pour trois joueurs cherchés au hasard laisserait croire qu'ils
 * sont en tête.
 *
 * Les bots y figurent comme les autres : ce sont des comptes, et un classement
 * dont on retirerait la moitié des joueurs ne serait plus un classement.
 */
export async function listRanking(limit = 10, search?: string): Promise<RankedAccount[]> {
  const term = search?.trim();
  const ranked = rankedAccounts();

  const query = db.select().from(ranked).orderBy(ranked.rank).limit(limit);
  const rows = term
    ? await query.where(sql`lower(${ranked.username}) like ${`%${term.toLowerCase()}%`}`)
    : await query;

  return rows.map((row) => ({
    rank: Number(row.rank),
    username: row.username,
    tag: row.tag,
    rating: row.rating,
    outfit: publicOutfit(row.outfit),
  }));
}

/**
 * Classement d'un joueur à partir de son identifiant anonyme. `STARTING_RATING`
 * s'il n'a pas de compte : un visiteur doit être traité comme un joueur moyen,
 * pas comme le plus faible du serveur.
 */
export async function getRatingForAnonId(anonId?: string): Promise<number> {
  if (!anonId) return STARTING_RATING;
  const [account] = await db.select().from(accounts).where(eq(accounts.anonId, anonId));
  return account?.rating ?? STARTING_RATING;
}

/**
 * Classement affichable : les meilleurs, plus le joueur connecté (désigné par
 * son code) s'il n'y est pas déjà.
 */
export async function listRankingFor(
  viewerTag?: string,
  limit = 10,
  search?: string,
): Promise<Ranking> {
  const top = await listRanking(limit, search);
  if (!viewerTag || top.some((row) => row.tag === viewerTag)) return { top };

  const viewer = await rankOf(viewerTag);
  return viewer ? { top, viewer } : { top };
}

/** La place d'un joueur dans le classement général. */
async function rankOf(tag: string): Promise<RankedAccount | undefined> {
  const ranked = rankedAccounts();
  const [row] = await db.select().from(ranked).where(eq(ranked.tag, tag));
  return row && { ...row, rank: Number(row.rank), outfit: publicOutfit(row.outfit) };
}

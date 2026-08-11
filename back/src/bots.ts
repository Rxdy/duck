import {
  DIRECTION_DELTA,
  isImmune,
  isWalkable,
  type GameState,
  type Player,
} from "./game-engine/index.js";
import type { Direction } from "./protocol.js";

const DIRECTIONS: Direction[] = ["UP", "DOWN", "LEFT", "RIGHT"];

/**
 * Niveaux de bots. La force vient de DEUX leviers, et jamais d'un troisième :
 *
 * 1. la cadence (`intervalMs`), toujours SOUS la vitesse d'un humain qui
 *    martèle la touche (~10-14 actions/s, voir docs/02-gameplay.md#rythme-de-
 *    déplacement). Un adversaire plus rapide qu'un humain ne se lit pas comme
 *    fort, il se lit comme un tricheur — et perdre contre plus rapide que soi
 *    n'apprend rien sur son propre niveau, ce qui ruinerait un classement.
 * 2. la qualité de décision. Tous VEULENT gagner — même le débutant vise la
 *    base adverse presque tout le temps ; un adversaire qui erre au hasard
 *    n'est pas un débutant, c'est un décor. Ce qui monte d'un niveau à
 *    l'autre, c'est l'exécution : hésiter parfois, puis viser sans faute,
 *    puis voir loin (donc ne plus se perdre dans les grands détours), puis
 *    savoir rentrer défendre.
 *
 * `sightRadius` est la portée de ce second levier : le bot calcule un vrai
 * chemin, mais seulement dans le rayon qu'il voit. Un mur à portée se
 * contourne ; au-delà, il vise à vol d'oiseau et se fait piéger par les longs
 * détours. C'est ce qui sépare un débutant d'un expert SANS jamais l'immobiliser
 * — un adversaire coincé contre un mur n'est pas un adversaire facile, c'est
 * un adversaire absent, et la partie ne se termine jamais.
 *
 * Les valeurs sont mesurées, pas devinées — `npx tsx src/bots.bench.ts` les
 * reproduit. Le banc : les trois cartes officielles 1v1 (13x9), adversaire
 * posté sur sa propre base et immobile, 200 essais par carte et par niveau,
 * comptés en pas jusqu'au premier point. On y lit la NAVIGATION seule, pas le
 * duel, et les secondes annoncées sont des **médianes** — le temps qu'un
 * joueur vit vraiment, pas le pire cas.
 *
 *   niveau         cadence  vue   pas (méd.)  s/point (méd.)  s/point (p90)
 *   Débutant         500ms    6           24            12.0           15.0
 *   Intermédiaire    400ms    8           20             8.0            8.8
 *   Confirmé         220ms    ∞           20             4.4            4.4
 *   Expert           160ms    ∞           20             3.2            3.2
 *   Impossible       120ms    ∞           20             2.4            2.4
 *
 * Une vue de 6 est un PLANCHER, pas un réglage : c'est la plus petite qui
 * fasse arriver le débutant à la base adverse à tous les coups. En dessous il
 * ne devient pas faible, il devient absent — à 5, un essai sur vingt n'aboutit
 * jamais et le neuvième décile explose à plus de cent pas ; à 4 et 3, la
 * quasi-totalité des essais tourne en rond indéfiniment. Un adversaire qui
 * n'arrive jamais ne rend pas la partie facile, il l'empêche de finir. La
 * faiblesse du débutant se lit donc dans l'ÉCART avec un bot qui voit tout :
 * 24 pas contre 20, et 30 contre 20 au neuvième décile. Il se perd, mais il
 * finit toujours par arriver.
 *
 * La cadence ne sert donc qu'à échelonner : c'est le seul levier qui reste une
 * fois la vue plancher atteinte. À 800 ms, le débutant mettait 19 s par point
 * (24 s au neuvième décile) — pas un adversaire faible, un adversaire
 * ennuyeux, qui traversait le plateau au pas.
 *
 * `rating` n'est PAS le niveau du bot : c'est le classement qu'on lui donne à
 * sa création, autour duquel le matchmaking le place (voir
 * botAccounts.ts#pickBotOpponents). Il bouge ensuite librement avec ses
 * résultats, sans jamais changer l'intelligence ci-dessus — voir
 * docs/05-comptes-progression.md#classement.
 */
export const BOT_LEVELS = {
  debutant: {
    label: "Débutant",
    intervalMs: 500,
    chaseChance: 0.85,
    sightRadius: 6,
    defends: false,
    rating: 200,
  },
  intermediaire: {
    label: "Intermédiaire",
    intervalMs: 400,
    chaseChance: 1,
    sightRadius: 8,
    defends: false,
    rating: 600,
  },
  confirme: {
    label: "Confirmé",
    intervalMs: 220,
    chaseChance: 1,
    sightRadius: Infinity,
    defends: false,
    rating: 1000,
  },
  expert: {
    label: "Expert",
    intervalMs: 160,
    chaseChance: 1,
    sightRadius: Infinity,
    defends: true,
    rating: 1400,
  },
  // Le seul niveau qui gagne les face-à-face par la vitesse pure. Toucher se
  // décide à CELUI QUI BOUGE LE PREMIER (voir game-engine/game.ts#canTag) :
  // à 120 ms, le bot tique plus vite qu'un humain ne réagit (~200 ms), et rafle
  // donc l'échange chaque fois qu'on se croise. C'est un mur volontaire, pas
  // un palier de progression — d'où son nom.
  impossible: {
    label: "Impossible",
    intervalMs: 120,
    chaseChance: 1,
    sightRadius: Infinity,
    defends: true,
    rating: 1800,
  },
} as const;

export type BotLevel = keyof typeof BOT_LEVELS;

export const DEFAULT_BOT_LEVEL: BotLevel = "intermediaire";

export function isBotLevel(value: unknown): value is BotLevel {
  return typeof value === "string" && value in BOT_LEVELS;
}

interface Point {
  x: number;
  y: number;
}

/**
 * Une case est franchissable pour ce bot si ce n'est pas un mur et qu'aucun
 * joueur INTOUCHABLE ne s'y trouve : depuis que marcher sur un adversaire le
 * renvoie au spawn (voir game-engine/game.ts), un joueur ordinaire n'est plus
 * un obstacle mais une occasion. Ne restent des murs que ceux qu'on ne peut
 * pas toucher — et ceux-là, ni contourner ni traverser.
 */
function canEnter(state: GameState, bot: Player, x: number, y: number, now: number): boolean {
  if (!isWalkable(state.map, x, y)) return false;
  return !state.players.some(
    (p) => p.id !== bot.id && p.x === x && p.y === y && (isImmune(p, now) || isImmune(bot, now)),
  );
}

/**
 * Premier pas d'un plus court chemin vers `target` (parcours en largeur).
 * `undefined` si la cible est inaccessible — un mur peut couper la carte en
 * deux le temps d'un instant, le bot doit alors faire autre chose plutôt que
 * de rester planté.
 */
export function firstStepTowards(
  state: GameState,
  bot: Player,
  target: Point,
  now: number,
): Direction | undefined {
  const start = `${bot.x},${bot.y}`;
  const seen = new Set([start]);
  const queue: { at: Point; first?: Direction }[] = [{ at: { x: bot.x, y: bot.y } }];

  while (queue.length > 0) {
    const { at, first } = queue.shift()!;
    if (at.x === target.x && at.y === target.y) return first;

    for (const direction of DIRECTIONS) {
      const { dx, dy } = DIRECTION_DELTA[direction];
      const next = { x: at.x + dx, y: at.y + dy };
      const key = `${next.x},${next.y}`;
      if (seen.has(key)) continue;
      // La case CIBLE est acceptée même occupée : c'est justement là qu'on va.
      const isTarget = next.x === target.x && next.y === target.y;
      if (!isTarget && !canEnter(state, bot, next.x, next.y, now)) continue;
      seen.add(key);
      queue.push({ at: next, first: first ?? direction });
    }
  }
  return undefined;
}

/** Distance à vol d'oiseau, la seule que le bot sache estimer hors de sa vue. */
function straightDistance(from: Point, to: Point): number {
  return Math.abs(to.x - from.x) + Math.abs(to.y - from.y);
}

/**
 * Premier pas vers `target` pour un bot qui ne voit que `radius` cases autour
 * de lui.
 *
 * Dans ce rayon, il calcule un VRAI chemin : un mur qu'il voit se contourne.
 * C'est ce qui le distingue d'un bot qui ne visait qu'à vol d'oiseau, lequel
 * repartait indéfiniment entre deux cases dès qu'un obstacle séparait les
 * deux directions qui rapprochent — un adversaire figé, pas un adversaire
 * faible.
 *
 * Au-delà de sa vue, il ne sait rien : il se dirige vers la case visible la
 * plus proche de la cible à vol d'oiseau. Il s'engage donc dans les détours
 * qui ont l'air d'aller dans la bonne direction, et se perd dans les pièges
 * plus grands que son horizon. C'est là, et seulement là, qu'un niveau faible
 * doit être faible.
 *
 * `undefined` quand rien de visible ne rapproche : à l'appelant de jouer autre
 * chose (un pas au hasard) plutôt que de s'entêter. Aucun bot ne reste donc
 * bloqué indéfiniment, même dans un cul-de-sac plus grand que sa vue.
 */
export function stepWithinSight(
  state: GameState,
  bot: Player,
  target: Point,
  now: number,
  radius: number,
): Direction | undefined {
  const from = { x: bot.x, y: bot.y };
  const seen = new Set([`${from.x},${from.y}`]);
  const queue: { at: Point; first?: Direction; depth: number }[] = [{ at: from, depth: 0 }];
  let best: { first: Direction; distance: number; depth: number } | undefined;

  while (queue.length > 0) {
    const { at, first, depth } = queue.shift()!;
    if (at.x === target.x && at.y === target.y) return first;

    // Meilleure case en vue : la plus proche de la cible à vol d'oiseau et, à
    // égalité, la moins loin d'ici — sans quoi le bot part en promenade pour
    // un gain nul.
    if (first) {
      const distance = straightDistance(at, target);
      if (!best || distance < best.distance || (distance === best.distance && depth < best.depth)) {
        best = { first, distance, depth };
      }
    }

    if (depth >= radius) continue;
    for (const direction of DIRECTIONS) {
      const { dx, dy } = DIRECTION_DELTA[direction];
      const next = { x: at.x + dx, y: at.y + dy };
      const key = `${next.x},${next.y}`;
      if (seen.has(key)) continue;
      // La case CIBLE est acceptée même occupée : c'est justement là qu'on va.
      const isTarget = next.x === target.x && next.y === target.y;
      if (!isTarget && !canEnter(state, bot, next.x, next.y, now)) continue;
      seen.add(key);
      queue.push({ at: next, first: first ?? direction, depth: depth + 1 });
    }
  }

  return best && best.distance < straightDistance(from, target) ? best.first : undefined;
}

/** Distance réelle (murs compris) entre deux points, `Infinity` si coupée. */
function pathDistance(state: GameState, bot: Player, from: Point, to: Point, now: number): number {
  const seen = new Set([`${from.x},${from.y}`]);
  const queue: { at: Point; steps: number }[] = [{ at: from, steps: 0 }];
  while (queue.length > 0) {
    const { at, steps } = queue.shift()!;
    if (at.x === to.x && at.y === to.y) return steps;
    for (const direction of DIRECTIONS) {
      const { dx, dy } = DIRECTION_DELTA[direction];
      const next = { x: at.x + dx, y: at.y + dy };
      const key = `${next.x},${next.y}`;
      if (seen.has(key)) continue;
      const isTarget = next.x === to.x && next.y === to.y;
      if (!isTarget && !canEnter(state, bot, next.x, next.y, now)) continue;
      seen.add(key);
      queue.push({ at: next, steps: steps + 1 });
    }
  }
  return Infinity;
}

/** Base adverse la plus proche, en distance réelle. */
function nearestEnemyBase(state: GameState, bot: Player, now: number): Point | undefined {
  let best: { point: Point; distance: number } | undefined;
  for (const other of state.players) {
    if (other.id === bot.id) continue;
    const point = { x: other.spawnX, y: other.spawnY };
    const distance = pathDistance(state, bot, { x: bot.x, y: bot.y }, point, now);
    if (!best || distance < best.distance) best = { point, distance };
  }
  return best?.point;
}

/**
 * Adversaire à intercepter : celui qui menace vraiment MA base, c'est-à-dire
 * qui en est plus proche que moi. Rentrer défendre pendant qu'on pouvait
 * marquer est un mauvais échange, sauf quand l'adversaire arrive avant nous.
 */
function interceptionTarget(state: GameState, bot: Player, now: number): Point | undefined {
  const home = { x: bot.spawnX, y: bot.spawnY };
  const myDistance = pathDistance(state, bot, { x: bot.x, y: bot.y }, home, now);

  let best: { point: Point; distance: number } | undefined;
  for (const other of state.players) {
    if (other.id === bot.id) continue;
    if (isImmune(other, now)) continue; // intouchable : le poursuivre ne sert à rien
    const distance = pathDistance(state, bot, { x: other.x, y: other.y }, home, now);
    if (distance >= myDistance) continue;
    if (!best || distance < best.distance) best = { point: { x: other.x, y: other.y }, distance };
  }
  return best?.point;
}

/**
 * Direction jouée par un bot à ce tour. Fonction pure (l'aléatoire est
 * injectable) : c'est toute l'intelligence du bot, elle doit pouvoir être
 * testée sans serveur, sans salle et sans minuteur.
 */
export function chooseBotDirection(
  state: GameState,
  botId: string,
  level: BotLevel,
  now: number,
  random: () => number = Math.random,
): Direction {
  const bot = state.players.find((p) => p.id === botId);
  if (!bot) return DIRECTIONS[0]!;

  const config = BOT_LEVELS[level];
  const playable = DIRECTIONS.filter((direction) => {
    const { dx, dy } = DIRECTION_DELTA[direction];
    return canEnter(state, bot, bot.x + dx, bot.y + dy, now);
  });

  // `chaseChance` n'est PAS "l'envie de gagner" : c'est la constance. En
  // dessous, le bot hésite et joue un pas au hasard, comme un joueur qui
  // part du mauvais côté avant de se reprendre.
  if (random() < config.chaseChance) {
    const target =
      (config.defends ? interceptionTarget(state, bot, now) : undefined) ??
      nearestEnemyBase(state, bot, now);

    if (target) {
      // Vue totale : le chemin exact, et rien à jouer si la cible est
      // momentanément murée (voir firstStepTowards). Vue limitée : le meilleur
      // pas dans ce que le bot voit.
      const step =
        config.sightRadius === Infinity
          ? firstStepTowards(state, bot, target, now)
          : stepWithinSight(state, bot, target, now, config.sightRadius);
      if (step) return step;
    }
  }

  if (playable.length > 0) return playable[Math.floor(random() * playable.length)]!;
  // Complètement bloqué (rare) : autant tenter quelque chose, applyMove ne
  // fera rien de toute façon.
  return DIRECTIONS[Math.floor(random() * DIRECTIONS.length)]!;
}

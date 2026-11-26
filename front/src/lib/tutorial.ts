/**
 * Camp d'entraînement : des petites cartes et des consignes qu'on valide une à
 * une. Tout se joue dans le navigateur — rien à gagner au classement, et le
 * script doit pouvoir REFUSER un déplacement, ce que le serveur de partie ne
 * fait pas. Les règles reprennent celles de back/src/game-engine/game.ts : à
 * garder alignées.
 */
import type { Direction } from "../types.js";

export interface Cell {
  x: number;
  y: number;
}

export interface Duck extends Cell {
  spawnX: number;
  spawnY: number;
  score: number;
  immuneUntil: number;
  facing?: Direction;
}

export interface World {
  /** '#' mur, '.' sol, 'A' ta base, 'B' la base adverse. */
  rows: string[];
  me: Duck;
  rival?: Duck;
}

export type Task = { text: string } & (
  | { kind: "reach"; x: number; y: number }
  | { kind: "bump"; direction: Direction }
  | { kind: "score" }
  | { kind: "tag" }
  | { kind: "match"; points: number }
);

export interface Lesson {
  key: string;
  title: string;
  summary: string;
  intro: string;
  success: string;
  rows: string[];
  rivalScore?: number;
  tasks: Task[];
}

export const DELTA: Record<Direction, Cell> = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
};
const DIRECTIONS = Object.keys(DELTA) as Direction[];

const IMMUNITY_MS = 1500;
const BASE_POINTS = 3;

export const LESSONS: Lesson[] = [
  {
    key: "deplacement",
    title: "Premiers pas",
    summary: "Avancer d'une case à la fois",
    intro:
      "Salut, moi c'est Coincoin ! Un appui = une case. Le plateau est vu en diagonale : le bouton allumé montre le sens à prendre.",
    success: "Parfait, tu sais avancer.",
    rows: ["#########", "#.......#", "#A......#", "#.......#", "#########"],
    tasks: [
      { kind: "reach", x: 4, y: 2, text: "Rejoins la case sous la flèche jaune." },
      { kind: "reach", x: 4, y: 1, text: "Change de sens pour rejoindre la nouvelle case." },
      { kind: "reach", x: 7, y: 3, text: "Dernière case : enchaîne les déplacements." },
    ],
  },
  {
    key: "murs",
    title: "Les murs",
    summary: "Pivoter et contourner",
    intro:
      "On ne traverse pas les murs. Mais ton canard peut toujours se tourner vers eux, même sans avancer.",
    success: "Tu pivotes et tu contournes. Les murs, c'est réglé.",
    rows: ["#########", "#...#...#", "#A..#...#", "#.......#", "#########"],
    tasks: [
      { kind: "reach", x: 3, y: 2, text: "Avance jusqu'au mur." },
      {
        kind: "bump",
        direction: "RIGHT",
        text: "Appuie contre le mur : tu restes sur place, mais tu te tournes.",
      },
      { kind: "reach", x: 6, y: 1, text: "Contourne le mur par le passage." },
    ],
  },
  {
    key: "marquer",
    title: "Marquer",
    summary: "Atteindre la base adverse",
    intro:
      "Le but du jeu : entrer sur la base de l'adversaire. Elle est à sa couleur. Ça rapporte 3 points, et tu repars de chez toi.",
    success: "+3 points ! Et te voilà de retour à ta base, intouchable un court instant.",
    rows: ["#########", "#...#...#", "#A..#..B#", "#.......#", "#########"],
    tasks: [{ kind: "score", text: "Entre sur la base cyan." }],
  },
  {
    key: "toucher",
    title: "Toucher",
    summary: "Renvoyer un adversaire et voler un point",
    intro:
      "Si tu fonces sur un adversaire, il retourne à sa base et tu lui voles 1 point. Celui-ci en a 3 et ne bouge pas.",
    success: "Volé ! Il repart chez lui avec un point de moins.",
    rows: ["#########", "#.......#", "#A.....B#", "#.......#", "#########"],
    rivalScore: 3,
    tasks: [{ kind: "tag", text: "Fonce sur le canard cyan." }],
  },
  {
    key: "match",
    title: "Le grand test",
    summary: "Un petit match contre un canard lent",
    intro:
      "À toi de jouer, sans filet. Le canard cyan vise ta base : touche-le pour le renvoyer, et file vers la sienne. Premier à 6 points.",
    success: "Bravo, tu connais tout. Tu es prêt pour une vraie partie !",
    rows: [
      "###########",
      "#.........#",
      "#..##.....#",
      "#A.......B#",
      "#.....##..#",
      "#.........#",
      "###########",
    ],
    tasks: [{ kind: "match", points: 6, text: "Marque 6 points avant lui." }],
  },
];

function find(rows: string[], mark: string): Cell | undefined {
  for (let y = 0; y < rows.length; y++) {
    const x = rows[y]!.indexOf(mark);
    if (x >= 0) return { x, y };
  }
  return undefined;
}

function duckAt(cell: Cell, score = 0): Duck {
  return { ...cell, spawnX: cell.x, spawnY: cell.y, score, immuneUntil: 0 };
}

export function createWorld(lesson: Lesson): World {
  // 'R' place l'adversaire ailleurs que sur sa base ; sans lui, il part de 'B'.
  const rival = find(lesson.rows, "R") ?? find(lesson.rows, "B");
  const needsRival = lesson.tasks.some((t) => t.kind === "tag" || t.kind === "match");
  return {
    rows: lesson.rows,
    me: duckAt(find(lesson.rows, "A")!),
    rival: rival && needsRival ? duckAt(rival, lesson.rivalScore) : undefined,
  };
}

export function isFloor(rows: string[], x: number, y: number): boolean {
  const tile = rows[y]?.[x];
  return tile !== undefined && tile !== "#";
}

/** Nombre de pas jusqu'à `goal` en contournant les murs. */
export function distance(rows: string[], from: Cell, goal: Cell): number {
  const seen = new Set([`${from.x},${from.y}`]);
  let frontier = [from];
  for (let steps = 0; frontier.length > 0; steps++) {
    const next: Cell[] = [];
    for (const cell of frontier) {
      if (cell.x === goal.x && cell.y === goal.y) return steps;
      for (const d of DIRECTIONS) {
        const x = cell.x + DELTA[d].x;
        const y = cell.y + DELTA[d].y;
        if (!isFloor(rows, x, y) || seen.has(`${x},${y}`)) continue;
        seen.add(`${x},${y}`);
        next.push({ x, y });
      }
    }
    frontier = next;
  }
  return Infinity;
}

/** La case à rejoindre pour la consigne en cours, mise en évidence sur le plateau. */
export function targetOf(world: World, task: Task): Cell | undefined {
  if (task.kind === "reach") return { x: task.x, y: task.y };
  if (task.kind === "score" || task.kind === "match") return find(world.rows, "B");
  if (task.kind === "tag") return world.rival;
  return undefined;
}

/** Les déplacements que la consigne accepte. Le match final les accepte tous. */
export function allowedMoves(world: World, task: Task): Direction[] {
  if (task.kind === "match") return DIRECTIONS;
  if (task.kind === "bump") return [task.direction];
  const target = targetOf(world, task)!;
  const now = distance(world.rows, world.me, target);
  return DIRECTIONS.filter((d) => {
    const x = world.me.x + DELTA[d].x;
    const y = world.me.y + DELTA[d].y;
    return isFloor(world.rows, x, y) && distance(world.rows, { x, y }, target) < now;
  });
}

const home = (duck: Duck, now: number): Duck => ({
  ...duck,
  x: duck.spawnX,
  y: duck.spawnY,
  immuneUntil: now + IMMUNITY_MS,
});

export interface MoveOutcome {
  world: World;
  scored: boolean;
  tagged: boolean;
}

export function applyStep(
  world: World,
  who: "me" | "rival",
  direction: Direction,
  now: number,
): MoveOutcome {
  const otherKey = who === "me" ? "rival" : "me";
  let mover: Duck = { ...world[who]!, facing: direction };
  let other = world[otherKey];
  const x = mover.x + DELTA[direction].x;
  const y = mover.y + DELTA[direction].y;
  const done = (scored = false, tagged = false): MoveOutcome => ({
    world: { ...world, [who]: mover, [otherKey]: other },
    scored,
    tagged,
  });

  if (!isFloor(world.rows, x, y)) return done();

  let tagged = false;
  if (other && other.x === x && other.y === y) {
    if (other.immuneUntil > now || mover.immuneUntil > now) return done();
    const stolen = Math.min(1, other.score);
    other = { ...home(other, now), score: other.score - stolen };
    mover.score += stolen;
    tagged = true;
  }

  const enemyBase = find(world.rows, who === "me" ? "B" : "A");
  if (enemyBase && enemyBase.x === x && enemyBase.y === y) {
    mover = { ...home(mover, now), score: mover.score + BASE_POINTS };
    return done(true, tagged);
  }
  mover = { ...mover, x, y };
  return done(false, tagged);
}

/** Le canard d'en face : il va droit vers ta base, sans stratégie. */
export function rivalMove(world: World): Direction | undefined {
  const goal = find(world.rows, "A")!;
  const rival = world.rival!;
  const now = distance(world.rows, rival, goal);
  return DIRECTIONS.find((d) => {
    const x = rival.x + DELTA[d].x;
    const y = rival.y + DELTA[d].y;
    return isFloor(world.rows, x, y) && distance(world.rows, { x, y }, goal) < now;
  });
}

export function isTaskDone(task: Task, outcome: MoveOutcome, direction: Direction): boolean {
  const { me } = outcome.world;
  if (task.kind === "reach") return me.x === task.x && me.y === task.y;
  if (task.kind === "bump") return direction === task.direction;
  if (task.kind === "score") return outcome.scored;
  if (task.kind === "tag") return outcome.tagged;
  return me.score >= task.points;
}

/** La tenue de l'adversaire d'entraînement. */
export const RIVAL_OUTFIT = ["casquette-envers", "sweat-skate", "planche-skate"];

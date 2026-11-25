import { Tile, isWalkable, type GameMap } from "./game-engine/index.js";

interface Point {
  x: number;
  y: number;
}

/**
 * Équilibre d'une carte officielle. **Symétrique ne veut pas dire équilibré** :
 * une carte peut être parfaitement miroir et se traverser en ligne droite,
 * auquel cas ses murs ne sont que du décor et le jeu se résume à une course.
 *
 * Ces règles sont donc vérifiées sur les vraies cartes de back/maps/ (voir
 * mapBalance.test.ts) : ajouter une carte déséquilibrée fait échouer la suite,
 * plutôt que d'être découvert en jouant.
 */
export interface BalanceProblem {
  between: [string, string] | null;
  reason: string;
}

function key(p: Point): string {
  return `${p.x},${p.y}`;
}

/** Distances depuis `start` vers toutes les cases atteignables. */
function distances(map: GameMap, start: Point, blocked?: Point): Map<string, number> {
  const seen = new Map<string, number>([[key(start), 0]]);
  const queue: Point[] = [start];
  while (queue.length > 0) {
    const at = queue.shift()!;
    for (const next of neighbours(at)) {
      if (seen.has(key(next)) || !isWalkable(map, next.x, next.y)) continue;
      if (blocked && next.x === blocked.x && next.y === blocked.y) continue;
      seen.set(key(next), seen.get(key(at))! + 1);
      queue.push(next);
    }
  }
  return seen;
}

function neighbours(p: Point): Point[] {
  return [
    { x: p.x + 1, y: p.y },
    { x: p.x - 1, y: p.y },
    { x: p.x, y: p.y + 1 },
    { x: p.x, y: p.y - 1 },
  ];
}

/** Un plus court chemin entre deux cases, vide s'il n'y en a aucun. */
function shortestPath(map: GameMap, from: Point, to: Point): Point[] {
  const previous = new Map<string, Point | null>([[key(from), null]]);
  const queue: Point[] = [from];
  while (queue.length > 0) {
    const at = queue.shift()!;
    if (at.x === to.x && at.y === to.y) {
      const path: Point[] = [];
      for (let step: Point | null = at; step; step = previous.get(key(step)) ?? null) {
        path.push(step);
      }
      return path.reverse();
    }
    for (const next of neighbours(at)) {
      if (previous.has(key(next)) || !isWalkable(map, next.x, next.y)) continue;
      previous.set(key(next), at);
      queue.push(next);
    }
  }
  return [];
}

/** Vrai si on va d'un point à l'autre en ligne droite, sans un seul mur. */
function isStraightShot(map: GameMap, a: Point, b: Point): boolean {
  if (a.x === b.x) {
    const [lo, hi] = [Math.min(a.y, b.y), Math.max(a.y, b.y)];
    for (let y = lo; y <= hi; y++) if (!isWalkable(map, a.x, y)) return false;
    return true;
  }
  if (a.y === b.y) {
    const [lo, hi] = [Math.min(a.x, b.x), Math.max(a.x, b.x)];
    for (let x = lo; x <= hi; x++) if (!isWalkable(map, x, a.y)) return false;
    return true;
  }
  return false;
}

/**
 * Case unique dont le retrait coupe `a` de `b` : un seul joueur posté dessus
 * verrouille la partie (voir docs/02-gameplay.md#toucher-un-adversaire).
 * Seules les cases d'un plus court chemin peuvent l'être — un goulot est par
 * définition sur TOUS les chemins.
 */
function findChokepoint(map: GameMap, a: Point, b: Point): Point | undefined {
  const path = shortestPath(map, a, b);
  for (const cell of path.slice(1, -1)) {
    if (!distances(map, a, cell).has(key(b))) return cell;
  }
  return undefined;
}

function bases(map: GameMap): Point[] {
  const out: Point[] = [];
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      if (map.tiles[y]?.[x] === Tile.Spawn) out.push({ x, y });
    }
  }
  return out;
}

/** Liste vide = carte équilibrée. */
export function auditBalance(map: GameMap): BalanceProblem[] {
  const problems: BalanceProblem[] = [];
  const spawns = bases(map);
  const name = (p: Point) => `base(${p.x},${p.y})`;

  for (let i = 0; i < spawns.length; i++) {
    for (let j = i + 1; j < spawns.length; j++) {
      const a = spawns[i]!;
      const b = spawns[j]!;
      const between: [string, string] = [name(a), name(b)];
      const distance = distances(map, a).get(key(b));

      if (distance === undefined) {
        problems.push({ between, reason: "les deux bases ne communiquent pas" });
        continue;
      }

      const manhattan = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
      if (isStraightShot(map, a, b)) {
        problems.push({ between, reason: "ligne droite : aucun mur en travers" });
      } else if (distance === manhattan) {
        problems.push({ between, reason: "trajet direct : les murs ne gênent pas" });
      }

      const choke = findChokepoint(map, a, b);
      if (choke) {
        problems.push({
          between,
          reason: `goulot en (${choke.x},${choke.y}) : un seul joueur suffit à le fermer`,
        });
      }
    }
  }

  // Personne ne doit avoir un voisin plus proche que ses adversaires.
  const profiles = spawns.map((from) => {
    const reach = distances(map, from);
    return spawns
      .filter((other) => other !== from)
      .map((other) => reach.get(key(other)) ?? -1)
      .sort((x, y) => x - y)
      .join(",");
  });
  if (new Set(profiles).size > 1) {
    problems.push({
      between: null,
      reason: `profils de distance inégaux : ${profiles.join(" | ")}`,
    });
  }

  // Une base doit avoir deux accès, sinon elle se bouche toute seule.
  for (const spawn of spawns) {
    const open = neighbours(spawn).filter((n) => isWalkable(map, n.x, n.y)).length;
    if (open < 2) {
      problems.push({ between: null, reason: `${name(spawn)} n'a qu'un seul accès` });
    }
  }

  // Une zone injoignable est du décor que personne ne verra jamais.
  if (spawns.length > 0) {
    const reach = distances(map, spawns[0]!);
    let isolated = 0;
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        if (isWalkable(map, x, y) && !reach.has(key({ x, y }))) isolated++;
      }
    }
    if (isolated > 0) {
      problems.push({ between: null, reason: `${isolated} case(s) isolée(s)` });
    }
  }

  return problems;
}

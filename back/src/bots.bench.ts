/**
 * Banc de mesure des niveaux de bots — `npx tsx src/bots.bench.ts [essais]`.
 *
 * Ce n'est pas un test (rien n'échoue ici) : c'est ce qui produit le tableau
 * de chiffres commenté dans bots.ts#BOT_LEVELS. Il existe pour que ces
 * chiffres restent vérifiables plutôt que de devenir du folklore — la version
 * précédente annonçait « 26 s » pour un débutant sans dire que c'était le
 * neuvième décile, et personne ne pouvait plus le retrouver.
 *
 * Le protocole, volontairement dépouillé : les trois cartes officielles 1v1,
 * un adversaire posté sur sa propre base et parfaitement immobile, et on
 * compte les pas jusqu'au premier point. On mesure donc la NAVIGATION seule,
 * pas le duel — le même étalon pour tous les niveaux.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { BOT_LEVELS, chooseBotDirection, type BotLevel } from "./bots.js";
import { applyMove, Tile, type GameMap, type GameState, type Player } from "./game-engine/index.js";

const MAPS_DIR = join(process.cwd(), "maps");
const SPAWN_KINDS = ["spawn-0", "spawn-1", "spawn-2", "spawn-3"];

/** Au-delà, on considère que le bot ne marquera jamais (voir `échecs`). */
const GIVE_UP_MS = 120_000;

interface OfficialMapFile {
  name?: string;
  width: number;
  height: number;
  tiles: string[][];
}

interface Duel {
  name: string;
  map: GameMap;
  spawns: { x: number; y: number }[];
}

function loadDuelMaps(): Duel[] {
  const duels: Duel[] = [];
  for (const file of readdirSync(MAPS_DIR)) {
    if (!file.endsWith(".json")) continue;
    const raw = JSON.parse(readFileSync(join(MAPS_DIR, file), "utf-8")) as OfficialMapFile;

    const spawns: { x: number; y: number }[] = [];
    for (const kind of SPAWN_KINDS) {
      raw.tiles.forEach((row, y) =>
        row.forEach((cell, x) => {
          if (cell === kind) spawns.push({ x, y });
        }),
      );
    }
    if (spawns.length !== 2) continue; // duel uniquement : deux bases, un chemin à faire

    const tiles = raw.tiles.map((row) =>
      row.map((kind) =>
        kind === "wall" ? Tile.Wall : SPAWN_KINDS.includes(kind) ? Tile.Spawn : Tile.Empty,
      ),
    );
    duels.push({
      name: raw.name ?? file,
      map: { width: raw.width, height: raw.height, tiles },
      spawns,
    });
  }
  return duels;
}

/** Aléatoire reproductible : deux exécutions du banc donnent les mêmes chiffres. */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function player(id: string, spawn: { x: number; y: number }): Player {
  return {
    id,
    name: id,
    color: "#ffffff",
    accessory: "none",
    x: spawn.x,
    y: spawn.y,
    spawnX: spawn.x,
    spawnY: spawn.y,
    score: 0,
    immuneUntil: 0,
  };
}

/** Pas joués avant le premier point, `Infinity` si le bot n'y arrive jamais. */
function stepsToScore(duel: Duel, level: BotLevel, random: () => number): number {
  let state: GameState = {
    id: "bench",
    map: duel.map,
    players: [player("bot", duel.spawns[0]!), player("cible", duel.spawns[1]!)],
  };

  const { intervalMs } = BOT_LEVELS[level];
  const limit = Math.ceil(GIVE_UP_MS / intervalMs);
  for (let step = 1; step <= limit; step++) {
    // L'horloge avance d'un tic par pas : c'est ce qui rend les immunités et
    // la cadence comparables entre niveaux.
    const now = step * intervalMs;
    state = applyMove(state, "bot", chooseBotDirection(state, "bot", level, now, random), now);
    if (state.players.find((p) => p.id === "bot")!.score > 0) return step;
  }
  return Infinity;
}

function quantile(values: number[], q: number): number {
  const reached = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (reached.length === 0) return Infinity;
  return reached[Math.min(reached.length - 1, Math.floor(q * reached.length))]!;
}

const runs = Number(process.argv[2] ?? 200);
const duels = loadDuelMaps();
if (duels.length === 0) {
  console.error(`Aucune carte 1v1 dans ${MAPS_DIR} — lancer depuis back/.`);
  process.exit(1);
}

console.log(`Cartes : ${duels.map((d) => d.name).join(", ")}`);
console.log(`${runs} essais par carte et par niveau\n`);
console.log("niveau         cadence   vue   pas (méd.)   s/point (méd.)   s/point (p90)   échecs");

for (const level of Object.keys(BOT_LEVELS) as BotLevel[]) {
  const { label, intervalMs, sightRadius } = BOT_LEVELS[level];
  const steps: number[] = [];
  for (const duel of duels) {
    for (let run = 0; run < runs; run++) steps.push(stepsToScore(duel, level, seededRandom(run)));
  }

  const median = quantile(steps, 0.5);
  const p90 = quantile(steps, 0.9);
  const seconds = (ticks: number) => ((ticks * intervalMs) / 1000).toFixed(1);
  console.log(
    [
      label.padEnd(14),
      `${intervalMs}ms`.padStart(7),
      (sightRadius === Infinity ? "∞" : String(sightRadius)).padStart(5),
      String(median).padStart(12),
      seconds(median).padStart(16),
      seconds(p90).padStart(16),
      String(steps.filter((s) => !Number.isFinite(s)).length).padStart(8),
    ].join(""),
  );
}

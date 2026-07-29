import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { GameMap } from "./game-engine/index.js";
import { buildMapFromWire, parseWireSpawns } from "./mapWire.js";

const MAPS_DIR = join(process.cwd(), "maps");
const SPAWN_KINDS = ["spawn-0", "spawn-1", "spawn-2", "spawn-3"];

interface OfficialMapFile {
  name?: string;
  category?: string;
  width: number;
  height: number;
  // Format éditeur (front/src/lib/mapEditor.ts) : "wall" | "empty" | "spawn-0".."spawn-3".
  tiles: string[][];
}

// Les 4 couleurs de spawn de l'éditeur sont fusionnées en un "Spawn" générique
// (le moteur de jeu n'a pas besoin de la couleur), exactement comme
// front/src/lib/mapEditor.ts#toWireTiles/toWireSpawns — dupliqué ici car
// front/ et back/ ne partagent pas de code (voir docs/06-architecture-technique.md).
function toWireTiles(tiles: string[][]): string[][] {
  return tiles.map((row) =>
    row.map((kind) => (kind === "wall" ? "Wall" : SPAWN_KINDS.includes(kind) ? "Spawn" : "Empty")),
  );
}

function toWireSpawns(tiles: string[][]): { x: number; y: number }[] {
  const spawns: { x: number; y: number }[] = [];
  for (const kind of SPAWN_KINDS) {
    tiles.forEach((row, y) =>
      row.forEach((cell, x) => {
        if (cell === kind) spawns.push({ x, y });
      }),
    );
  }
  return spawns;
}

function readOfficialMaps(category: string, mapsDir: string): OfficialMapFile[] {
  let files: string[];
  try {
    files = readdirSync(mapsDir);
  } catch {
    return []; // dossier pas encore créé (aucune carte sauvegardée) : pas une erreur.
  }

  const maps: OfficialMapFile[] = [];
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    try {
      const raw = JSON.parse(readFileSync(join(mapsDir, file), "utf-8")) as OfficialMapFile;
      if (raw.category === category) maps.push(raw);
    } catch {
      // Fichier corrompu/illisible : on l'ignore plutôt que de planter le serveur.
    }
  }
  return maps;
}

/**
 * Choisit au hasard une carte officielle (créée par les développeurs dans
 * l'éditeur puis sauvegardée dans back/maps/, voir front/src/lib/mapExport.ts)
 * pour la catégorie donnée. `undefined` s'il n'y en a aucune — l'appelant
 * retombe alors sur la génération procédurale (voir back/src/index.ts).
 */
export function pickRandomOfficialMap(
  category: "duel" | "equipe",
  mapsDir: string = MAPS_DIR,
): { map: GameMap; spawns: { x: number; y: number }[]; name: string } | undefined {
  const candidates = readOfficialMaps(category, mapsDir);
  if (candidates.length === 0) return undefined;

  const chosen = candidates[Math.floor(Math.random() * candidates.length)]!;
  const map = buildMapFromWire({
    width: chosen.width,
    height: chosen.height,
    tiles: toWireTiles(chosen.tiles),
  });
  const spawns = parseWireSpawns(toWireSpawns(chosen.tiles), map);
  return { map, spawns, name: chosen.name ?? "Carte sans nom" };
}

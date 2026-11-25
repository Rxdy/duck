import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { GameMap } from "./game-engine/index.js";
import { buildMapFromWire, parseWireSpawns } from "./mapWire.js";
import type { WireSpawn } from "./protocol.js";

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

function toWireSpawns(tiles: string[][]): WireSpawn[] {
  const spawns: WireSpawn[] = [];
  // L'indice de couleur vient du KIND, jamais du rang dans la liste : une
  // carte officielle qui n'utilise pas spawn-1 (0/2/3, par exemple) doit
  // quand même colorer le canard du spawn ambre en ambre.
  SPAWN_KINDS.forEach((kind, color) => {
    tiles.forEach((row, y) =>
      row.forEach((cell, x) => {
        if (cell === kind) spawns.push({ x, y, color });
      }),
    );
  });
  return spawns;
}

/**
 * Nombre de bases d'une carte, lu dans les cases elles-mêmes plutôt que dans
 * une métadonnée du fichier : c'est ce nombre qui décide du mode auquel la
 * carte se prête (voir shared.ts#GAME_MODES), et une métadonnée peut mentir
 * ou vieillir alors que les cases, jamais.
 */
function countSpawns(tiles: string[][]): number {
  return SPAWN_KINDS.filter((kind) => tiles.some((row) => row.includes(kind))).length;
}

function readOfficialMaps(mapsDir: string): OfficialMapFile[] {
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
      maps.push(JSON.parse(readFileSync(join(mapsDir, file), "utf-8")) as OfficialMapFile);
    } catch {
      // Fichier corrompu/illisible : on l'ignore plutôt que de planter le serveur.
    }
  }
  return maps;
}

/**
 * Choisit au hasard une carte officielle (créée dans l'éditeur puis
 * sauvegardée dans back/maps/, voir front/src/lib/mapExport.ts) ayant
 * exactement `playerCount` bases — une partie à 3 joueurs a besoin de 3
 * bases, ni plus ni moins. `undefined` s'il n'en existe aucune : à l'appelant
 * de le dire au joueur (voir back/src/index.ts), plutôt que de le lancer sur
 * une carte au mauvais nombre de bases.
 */
export function pickRandomOfficialMap(
  playerCount: number,
  mapsDir: string = MAPS_DIR,
): { map: GameMap; spawns: WireSpawn[]; name: string } | undefined {
  const candidates = readOfficialMaps(mapsDir).filter(
    (candidate) => countSpawns(candidate.tiles) === playerCount,
  );
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

/**
 * Aperçu d'une carte officielle : la grille au format ÉDITEUR (couleurs de
 * spawn comprises), pas le format moteur. Le joueur doit voir la carte comme
 * elle sera jouée, avec chaque base à sa couleur — le "Spawn" générique
 * envoyé en partie (voir toWireTiles) ne le permettrait pas.
 */
export interface OfficialMapPreview {
  name: string;
  width: number;
  height: number;
  tiles: string[][];
  players: number;
}

/**
 * Toutes les cartes officielles, pour les montrer avant de lancer une partie
 * (voir front/src/pages/Play.vue) : on tombe au hasard sur l'une d'elles, il
 * n'y a aucune raison de les découvrir seulement une fois la partie commencée.
 */
export function listOfficialMaps(mapsDir: string = MAPS_DIR): OfficialMapPreview[] {
  return readOfficialMaps(mapsDir)
    .map((file) => ({
      name: file.name ?? "Carte sans nom",
      width: file.width,
      height: file.height,
      tiles: file.tiles,
      players: countSpawns(file.tiles),
    }))
    .sort((a, b) => a.players - b.players || a.name.localeCompare(b.name));
}

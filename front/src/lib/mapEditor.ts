import { PLAYER_COLORS } from "../theme.js";

export const SPAWN_KINDS = ["spawn-0", "spawn-1", "spawn-2", "spawn-3"] as const;
export type SpawnKind = (typeof SPAWN_KINDS)[number];
export type TileKind = "empty" | "wall" | SpawnKind;

/** Outil actif dans l'éditeur : un mur, ou un spawn d'une couleur donnée. */
export type Tool = "wall" | SpawnKind;

export function isSpawnKind(kind: TileKind): kind is SpawnKind {
  return (SPAWN_KINDS as readonly string[]).includes(kind);
}

export function spawnColor(kind: SpawnKind): string {
  return PLAYER_COLORS[SPAWN_KINDS.indexOf(kind)]!;
}

export interface EditorMap {
  width: number;
  height: number;
  tiles: TileKind[][]; // tiles[y][x]
}

export function isBorder(width: number, height: number, x: number, y: number): boolean {
  return x === 0 || y === 0 || x === width - 1 || y === height - 1;
}

/**
 * Nouvelle carte vide. `playableWidth`/`playableHeight` correspondent à la
 * zone jouable demandée (ex. "15x9" choisi dans le sélecteur) — les murs du
 * contour viennent EN PLUS et ne rognent pas dessus, voir docs/02-gameplay.md.
 * La carte réelle mesure donc (playableWidth + 2) x (playableHeight + 2).
 */
export function createEmptyMap(playableWidth: number, playableHeight: number): EditorMap {
  const width = playableWidth + 2;
  const height = playableHeight + 2;
  const tiles: TileKind[][] = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => (isBorder(width, height, x, y) ? "wall" : "empty")),
  );
  return { width, height, tiles };
}

export function countSpawns(map: EditorMap): number {
  return map.tiles.flat().filter(isSpawnKind).length;
}

/**
 * Pose (ou retire, si on retape le même outil sur la même case) un élément.
 * Le contour n'est jamais modifiable. Chaque couleur de spawn n'existe qu'à
 * un seul endroit à la fois : en poser une nouvelle occurrence déplace
 * l'ancienne (pas de doublon de couleur, donc jamais plus de 4 spawns).
 */
export function placeTile(map: EditorMap, x: number, y: number, kind: TileKind): EditorMap {
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) return map;
  if (isBorder(map.width, map.height, x, y)) return map;

  const current = map.tiles[y]![x];
  const next: TileKind = current === kind ? "empty" : kind;

  const tiles = map.tiles.map((row, rowIndex) =>
    row.map((cell, colIndex) => {
      if (rowIndex === y && colIndex === x) return next;
      if (isSpawnKind(next) && cell === next) return "empty"; // ancien emplacement de cette couleur
      return cell;
    }),
  );

  return { ...map, tiles };
}

export function toPlacedTiles(map: EditorMap): { x: number; y: number; kind: TileKind }[] {
  const placed: { x: number; y: number; kind: TileKind }[] = [];
  map.tiles.forEach((row, y) => row.forEach((kind, x) => placed.push({ x, y, kind })));
  return placed;
}

/**
 * Libellé du mode jouable selon le nombre de spawns posés (voir
 * docs/02-gameplay.md pour les modes). Sous 2 spawns, pas encore jouable.
 */
export function playableLabel(spawnCount: number): string {
  if (spawnCount < 2) return "Pas encore jouable";
  if (spawnCount === 2) return "Jouable en Duel (1v1)";
  if (spawnCount === 3) return "Jouable en FFA 3 joueurs";
  return "Jouable en 2v2 / FFA 4 joueurs";
}

/**
 * Convertit la matrice de l'éditeur vers le format attendu par le serveur
 * (valeurs de l'enum Tile de back/src/game-engine/tile.ts). Les 4 couleurs de
 * spawn sont fusionnées en un seul "Spawn" générique : pour l'entraînement
 * solo, le serveur n'a pas besoin de savoir à quel joueur/couleur il
 * correspondait dans l'éditeur.
 */
export function toWireTiles(map: EditorMap): string[][] {
  return map.tiles.map((row) =>
    row.map((kind) => {
      if (kind === "wall") return "Wall";
      if (isSpawnKind(kind)) return "Spawn";
      return "Empty";
    }),
  );
}

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
 * spawn sont fusionnées en un seul "Spawn" générique : le serveur n'a pas
 * besoin de connaître la couleur pour faire marcher le jeu (murs, collisions,
 * bases). L'ordre des couleurs est transmis séparément par `toWireSpawns` pour
 * que le joueur qui apparaît sur un spawn ait bien la couleur de ce spawn.
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

/**
 * Position de chaque spawn posé, dans l'ordre des couleurs (spawn-0, puis
 * spawn-1...), avec l'indice de sa couleur dans PLAYER_COLORS.
 *
 * Cet indice est indispensable : les couleurs non posées sont absentes de la
 * liste, donc la position d'un spawn dans le tableau ne dit RIEN de sa
 * couleur. Une carte spawn-0/spawn-2/spawn-3 renverrait 3 entrées, et un
 * serveur qui colorerait par ordre d'arrivée peindrait le canard du spawn
 * ambre (spawn-2) en cyan — la case et le canard ne s'accorderaient plus
 * (voir back/src/room.ts#addPlayer).
 */
export function toWireSpawns(map: EditorMap): { x: number; y: number; color: number }[] {
  const spawns: { x: number; y: number; color: number }[] = [];
  SPAWN_KINDS.forEach((kind, color) => {
    map.tiles.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell === kind) spawns.push({ x, y, color });
      });
    });
  });
  return spawns;
}

/**
 * Sens inverse de toWireTiles : convertit une valeur de l'enum Tile envoyée
 * par le serveur (voir back/src/protocol.ts#MapMessage, mode "Jouer") vers un
 * TileKind affichable. Le serveur ne transmet pas la couleur d'un spawn (il
 * ne la connaît pas lui-même, voir toWireTiles) : la base d'un joueur se
 * distingue visuellement via le halo de territoire (lib/board.ts), pas via
 * la couleur de la case elle-même, donc "Spawn"/"Goal"/"Water"/"Bonus"
 * retombent tous sur "empty" pour l'instant (seul le mur est distinct).
 */
export function wireTileToKind(value: string): TileKind {
  return value === "Wall" ? "wall" : "empty";
}

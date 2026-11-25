import { MAX_PLAYABLE_SIZE, MIN_PLAYABLE_SIZE } from "./board.js";
import { isBorder, SPAWN_KINDS, type EditorMap, type TileKind } from "./mapEditor.js";

/**
 * Représentation texte d'une carte, une ligne par rangée de cases :
 *
 *     #########
 *     #0.....1#
 *     #..###..#
 *     #########
 *
 * `#` mur, `.` case vide, `0`-`3` spawn de la couleur correspondante (voir
 * mapEditor.ts#SPAWN_KINDS). C'est le format déjà utilisé dans
 * docs/02-gameplay.md, et surtout le plus simple à produire pour quelqu'un —
 * ou quelque chose — qui ne dispose que des règles d'édition : une IA à qui
 * on donne cette légende sait générer des cartes entières, et un joueur peut
 * garder une matrice dans un fichier texte comme point de sauvegarde.
 */
const WALL_CHAR = "#";
const EMPTY_CHAR = ".";
// L'espace est accepté comme case vide à la lecture (une matrice écrite à la
// main ou générée l'utilise souvent), jamais produit à l'écriture.
const ALTERNATE_EMPTY_CHAR = " ";

const MIN_TOTAL_SIZE = MIN_PLAYABLE_SIZE + 2; // +2 = les murs du contour
const MAX_TOTAL_SIZE = MAX_PLAYABLE_SIZE + 2;

function charForKind(kind: TileKind): string {
  if (kind === "wall") return WALL_CHAR;
  const spawnIndex = SPAWN_KINDS.indexOf(kind as (typeof SPAWN_KINDS)[number]);
  return spawnIndex >= 0 ? String(spawnIndex) : EMPTY_CHAR;
}

/** Matrice texte de la carte, prête à être copiée. */
export function toMatrixText(map: EditorMap): string {
  return map.tiles.map((row) => row.map(charForKind).join("")).join("\n");
}

export type MatrixParseResult =
  { ok: true; map: EditorMap; warnings: string[] } | { ok: false; error: string };

/**
 * Lit une matrice texte (voir toMatrixText) et la transforme en carte
 * éditable. Volontairement bavard en cas d'échec : une matrice arrive
 * souvent d'ailleurs (fichier texte, IA), et « ça ne marche pas » sans dire
 * quelle ligne est en cause rend le format inutilisable.
 *
 * Une seule tolérance, le contour : une matrice dont les bords ne sont pas
 * tous des murs est corrigée plutôt que rejetée (l'éditeur interdit de
 * modifier le contour, voir mapEditor.ts#placeTile — importer une carte
 * qu'on ne pourrait pas réparer ensuite serait pire). Le correctif est
 * signalé dans `warnings`.
 */
export function parseMatrixText(text: string): MatrixParseResult {
  const rows = trimBlankEdges(text.split(/\r?\n/).map((line) => line.trimEnd()));

  if (rows.length === 0) return { ok: false, error: "La matrice est vide." };

  const width = rows[0]!.length;
  const height = rows.length;

  const uneven = rows.findIndex((row) => row.length !== width);
  if (uneven >= 0) {
    return {
      ok: false,
      error: `Toutes les lignes doivent avoir la même largeur : ligne ${uneven + 1} en fait ${rows[uneven]!.length} au lieu de ${width}.`,
    };
  }

  if (width < MIN_TOTAL_SIZE || height < MIN_TOTAL_SIZE) {
    return {
      ok: false,
      error: `Carte trop petite (${width}x${height}) : minimum ${MIN_TOTAL_SIZE}x${MIN_TOTAL_SIZE} murs du contour compris.`,
    };
  }
  if (width > MAX_TOTAL_SIZE || height > MAX_TOTAL_SIZE) {
    return {
      ok: false,
      error: `Carte trop grande (${width}x${height}) : maximum ${MAX_TOTAL_SIZE}x${MAX_TOTAL_SIZE} murs du contour compris.`,
    };
  }

  const tiles: TileKind[][] = [];
  const spawnCounts = new Map<string, number>();

  for (let y = 0; y < height; y++) {
    const row: TileKind[] = [];
    for (let x = 0; x < width; x++) {
      const char = rows[y]![x]!;
      const kind = kindForChar(char);
      if (!kind) {
        return {
          ok: false,
          error: `Caractère « ${char} » inconnu ligne ${y + 1}, colonne ${x + 1}. Attendu : « ${WALL_CHAR} » (mur), « ${EMPTY_CHAR} » (vide) ou 0-${SPAWN_KINDS.length - 1} (spawn).`,
        };
      }
      if (kind.startsWith("spawn-")) spawnCounts.set(kind, (spawnCounts.get(kind) ?? 0) + 1);
      row.push(kind);
    }
    tiles.push(row);
  }

  // Une couleur de spawn est unique par carte dans l'éditeur (voir
  // mapEditor.ts#placeTile, qui efface l'ancien emplacement) : deux « 2 » ne
  // représentent aucune carte que l'éditeur puisse produire, et le serveur y
  // ferait apparaître deux joueurs de la même couleur.
  const duplicate = [...spawnCounts.entries()].find(([, count]) => count > 1);
  if (duplicate) {
    const index = SPAWN_KINDS.indexOf(duplicate[0] as (typeof SPAWN_KINDS)[number]);
    return {
      ok: false,
      error: `Le spawn ${index} apparaît ${duplicate[1]} fois : chaque couleur ne peut être posée qu'une seule fois.`,
    };
  }

  const warnings: string[] = [];
  let fixedBorder = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!isBorder(width, height, x, y)) continue;
      if (tiles[y]![x] === "wall") continue;
      tiles[y]![x] = "wall";
      fixedBorder++;
    }
  }
  if (fixedBorder > 0) {
    warnings.push(
      `${fixedBorder} case(s) du contour transformée(s) en mur : le tour de la carte doit être fermé.`,
    );
  }

  return { ok: true, map: { width, height, tiles }, warnings };
}

function kindForChar(char: string): TileKind | undefined {
  if (char === WALL_CHAR) return "wall";
  if (char === EMPTY_CHAR || char === ALTERNATE_EMPTY_CHAR) return "empty";
  const spawnIndex = Number(char);
  return Number.isInteger(spawnIndex) && char.trim() !== "" && SPAWN_KINDS[spawnIndex]
    ? SPAWN_KINDS[spawnIndex]
    : undefined;
}

/** Retire les lignes vides avant/après la matrice (copier-coller). */
function trimBlankEdges(lines: string[]): string[] {
  let start = 0;
  let end = lines.length;
  while (start < end && lines[start]!.trim() === "") start++;
  while (end > start && lines[end - 1]!.trim() === "") end--;
  return lines.slice(start, end);
}

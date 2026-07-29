import { isSpawnKind, spawnColor } from "./mapEditor.js";
import type { TileKind } from "./mapEditor.js";

export interface BoardTile {
  x: number;
  y: number;
  shade: "light" | "dark";
}

export function buildBoardTiles(width: number, height: number): BoardTile[] {
  const tiles: BoardTile[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      tiles.push({ x, y, shade: (x + y) % 2 === 0 ? "light" : "dark" });
    }
  }
  return tiles;
}

/**
 * Couleur d'une case : couleur pleine et distincte pour mur/spawn, sinon le
 * damier par défaut (cases "vides", ou aucune donnée d'éditeur fournie —
 * cas de l'aperçu pendant une partie en cours).
 */
export function tileColor(kind: TileKind | undefined, shade: "light" | "dark"): string {
  if (kind === "wall") return "#6b7280";
  if (kind && isSpawnKind(kind)) return spawnColor(kind);
  return shade === "light" ? "#33415b" : "#28374d";
}

export type Facing = "up" | "down" | "left" | "right";

/**
 * Direction affichée par le canard (voir organisms/DuckSprite.vue) : le
 * déplacement se fait par téléportation case par case (pas d'interpolation
 * continue), donc pas besoin d'angle intermédiaire — seulement l'une des 4
 * poses fixes correspondant à la dernière case franchie. `undefined` si
 * `dx`/`dy` sont tous les deux nuls (ne devrait pas arriver pour un vrai
 * déplacement, mais évite de forcer une face par défaut arbitraire).
 */
export function directionFacing(dx: number, dy: number): Facing | undefined {
  if (dx > 0) return "right";
  if (dx < 0) return "left";
  if (dy > 0) return "down";
  if (dy < 0) return "up";
  return undefined;
}

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace("#", "");
  return [
    parseInt(normalized.slice(0, 2), 16),
    parseInt(normalized.slice(2, 4), 16),
    parseInt(normalized.slice(4, 6), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.round(n).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** Mélange `tint` dans `base` : ratio 0 = base pure, 1 = tint pur. */
export function mixHexColors(base: string, tint: string, ratio: number): string {
  const [br, bg, bb] = hexToRgb(base);
  const [tr, tg, tb] = hexToRgb(tint);
  return rgbToHex(br + (tr - br) * ratio, bg + (tg - bg) * ratio, bb + (tb - bb) * ratio);
}

export interface TerritoryBase {
  x: number;
  y: number;
  color: string;
}

const TERRITORY_RADIUS = 3.5;
const TERRITORY_STRENGTH = 0.35;

/**
 * Vrai si un mur coupe la ligne droite entre les deux cases — un territoire
 * doit se comporter comme une lumière : il ne traverse pas les murs, même à
 * portée. Tracé de ligne de Bresenham (algorithme standard, entier) : visite
 * exactement les cases traversées par le segment, sans les approximations
 * d'un échantillonnage à pas fixe qui pouvait "sauter" une case selon
 * l'angle. Les deux extrémités ne sont jamais testées (la base elle-même
 * n'est jamais un mur, ni la case qu'on est en train de colorer).
 */
function isLineOfSightBlocked(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  isWall: (x: number, y: number) => boolean,
): boolean {
  let x = x0;
  let y = y0;
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const stepX = x0 < x1 ? 1 : -1;
  const stepY = y0 < y1 ? 1 : -1;
  let error = dx + dy;

  while (x !== x1 || y !== y1) {
    const doubledError = 2 * error;
    if (doubledError >= dy) {
      error += dy;
      x += stepX;
    }
    if (doubledError <= dx) {
      error += dx;
      y += stepY;
    }
    if ((x !== x1 || y !== y1) && isWall(x, y)) return true;
  }
  return false;
}

/**
 * Teinte une case de sol vers la couleur de la base la plus proche, si elle
 * est à portée (rayon ~3-4 cases) ET en vue directe (pas de mur entre les
 * deux, voir isLineOfSightBlocked) : donne un repère visuel de "territoire"
 * autour de chaque spawn, comme une lumière plutôt qu'un halo qui traverse
 * tout. Ne s'applique qu'aux cases neutres (mur/spawn gardent leur couleur
 * propre, voir tileColor) — à l'appelant de filtrer `bases`/la case fournie.
 */
export function applyTerritoryTint(
  floorColor: string,
  x: number,
  y: number,
  bases: TerritoryBase[],
  isWall: (x: number, y: number) => boolean = () => false,
): string {
  let nearest: { distance: number; color: string } | undefined;
  for (const base of bases) {
    const distance = Math.hypot(x - base.x, y - base.y);
    if (distance > TERRITORY_RADIUS) continue;
    if (nearest && distance >= nearest.distance) continue;
    if (isLineOfSightBlocked(base.x, base.y, x, y, isWall)) continue;
    nearest = { distance, color: base.color };
  }
  return nearest ? mixHexColors(floorColor, nearest.color, TERRITORY_STRENGTH) : floorColor;
}

export interface BoardPreset {
  id: string;
  label: string;
  category: "duel" | "equipe";
  width: number;
  height: number;
}

/**
 * Tailles de plateau proposées dans l'éditeur (voir docs/02-gameplay.md pour les modes).
 * 30x30+ est beaucoup trop grand pour commencer : on part sur des tailles jouables et
 * lisibles, plus petites pour le duel (plateau rectangulaire, façon "couloir" 2 joueurs)
 * que pour les modes à 4 joueurs (2v2, FFA4), qui restent proches du carré, 20x20 max
 * pour l'instant. Les cartes plus grandes viendront plus tard.
 */
export const BOARD_PRESETS: BoardPreset[] = [
  { id: "duel-s", label: "S", category: "duel", width: 11, height: 7 },
  { id: "duel-m", label: "M", category: "duel", width: 15, height: 9 },
  { id: "duel-l", label: "L", category: "duel", width: 19, height: 11 },
  { id: "equipe-s", label: "S", category: "equipe", width: 15, height: 15 },
  { id: "equipe-m", label: "M", category: "equipe", width: 18, height: 18 },
  { id: "equipe-l", label: "L", category: "equipe", width: 20, height: 20 },
];

export interface CameraFrame {
  position: [number, number, number];
  target: [number, number, number];
  up: [number, number, number];
  viewSize: number;
}

/**
 * Cadrage isométrique (position caméra + cible + demi-hauteur de vue orthographique)
 * pour qu'un plateau width x height tienne entièrement dans le cadre, quelle que
 * soit sa taille. Utilisé pour le rendu d'une partie en cours.
 */
export function computeIsometricFrame(width: number, height: number): CameraFrame {
  const centerX = width / 2;
  const centerZ = height / 2;
  const diagonal = Math.sqrt(width * width + height * height);
  const offset = diagonal * 0.7;

  return {
    position: [centerX + offset, offset, centerZ + offset],
    target: [centerX, 0, centerZ],
    up: [0, 1, 0],
    viewSize: diagonal * 0.62,
  };
}

/**
 * Cadrage vue de dessus (caméra directement au-dessus du plateau, qui regarde
 * vers le bas). Utilisé pour l'éditeur de carte : plus précis pour placer les
 * éléments (murs, spawn, base...) qu'une vue en angle où les cases se
 * chevauchent visuellement.
 */
export function computeTopDownFrame(width: number, height: number): CameraFrame {
  const centerX = width / 2;
  const centerZ = height / 2;
  const maxSide = Math.max(width, height);

  return {
    position: [centerX, maxSide, centerZ],
    target: [centerX, 0, centerZ],
    // Regarder droit vers le bas rend le vecteur "up" par défaut (0,1,0) dégénéré
    // (parallèle à la direction de vue) : on force une orientation prévisible.
    up: [0, 0, -1],
    viewSize: maxSide * 0.55,
  };
}

/**
 * Certains navigateurs/webviews (environnements distants, sandbox sans GPU...)
 * ne peuvent créer aucun contexte WebGL, même logiciel. Le vérifier avant de
 * monter le renderer TresJS évite un crash silencieux de tout le composant.
 */
export function isWebglAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

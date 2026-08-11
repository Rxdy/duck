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
 * Palettes du plateau. Le rendu 3D ne peut pas hériter des variables CSS du
 * thème : ses couleurs partent dans des matériaux WebGL, pas dans du style.
 * Elles sont donc dupliquées ici, et choisies au moment du rendu.
 */
const BOARD_PALETTE = {
  dark: { wall: "#6b7280", floorLight: "#33415b", floorDark: "#28374d", background: "#020617" },
  light: { wall: "#94a3b8", floorLight: "#dbe3ef", floorDark: "#c8d3e2", background: "#f1f5f9" },
} as const;

export type BoardTheme = keyof typeof BOARD_PALETTE;

/** Couleur de fond du canvas, derrière le plateau. */
export function boardBackground(theme: BoardTheme = "dark"): string {
  return BOARD_PALETTE[theme].background;
}

/**
 * Couleur d'une case : couleur pleine et distincte pour mur/spawn, sinon le
 * damier par défaut (cases "vides", ou aucune donnée d'éditeur fournie —
 * cas de l'aperçu pendant une partie en cours).
 *
 * Les couleurs de spawn, elles, ne changent pas avec le thème : ce sont les
 * couleurs des JOUEURS, elles doivent rester reconnaissables partout.
 */
export function tileColor(
  kind: TileKind | undefined,
  shade: "light" | "dark",
  theme: BoardTheme = "dark",
): string {
  const palette = BOARD_PALETTE[theme];
  if (kind === "wall") return palette.wall;
  if (kind && isSpawnKind(kind)) return spawnColor(kind);
  return shade === "light" ? palette.floorLight : palette.floorDark;
}

/**
 * Dimensions d'une case en 3D, partagées par tout ce qui dessine un plateau.
 *
 * Elles vivaient dans BoardPreview.vue, donc le rendu d'une partie était le
 * seul à les connaître. Depuis que les vignettes de « Mes cartes » dessinent
 * elles aussi un plateau (voir lib/mapThumbnail.ts), deux copies auraient
 * suffi à faire mentir la vignette : un aperçu qui ne ressemble pas au
 * plateau qu'on va jouer ne sert à rien.
 */
export const TILE_SIZE = 0.94;
export const FLOOR_HEIGHT = 0.25;
/**
 * Un mur qui dépasserait la hauteur du canard (1.05) cacherait le jeu derrière
 * lui en vue isométrique : on reste nettement en dessous.
 */
export const WALL_HEIGHT = 0.4;

/** Une case prête à être dessinée : position, couleur et volume. */
export interface BoardMesh {
  x: number;
  y: number;
  color: string;
  height: number;
  /** Centre vertical du bloc. Toutes les cases partagent la même base, donc un
   *  mur pousse vers le haut depuis le sol au lieu de flotter ou d'être enterré. */
  centerY: number;
}

/**
 * Les cases d'un plateau, prêtes à dessiner. Fonction pure : c'est toute la
 * lecture d'une carte (damier, murs, bases, territoires), et elle doit pouvoir
 * être testée sans WebGL, sans composant et sans navigateur.
 *
 * `tiles` porte les données de l'éditeur ; sans elles, damier par défaut (cas
 * d'une partie en cours, où le serveur n'envoie que les murs).
 */
export function buildBoardMeshes(options: {
  width: number;
  height: number;
  tiles?: { x: number; y: number; kind: TileKind }[];
  theme?: BoardTheme;
  /** Bases des joueurs : teintent le sol alentour. Vide -> aucun territoire. */
  bases?: TerritoryBase[];
}): BoardMesh[] {
  const { width, height, tiles, theme = "dark", bases = [] } = options;
  const overrides = new Map(tiles?.map((t) => [`${t.x},${t.y}`, t.kind]));
  const isWallAt = (x: number, y: number) => overrides.get(`${x},${y}`) === "wall";

  return buildBoardTiles(width, height).map((tile) => {
    const kind = overrides.get(`${tile.x},${tile.y}`);
    const blockHeight = kind === "wall" ? WALL_HEIGHT : FLOOR_HEIGHT;
    const baseColor = tileColor(kind, tile.shade, theme);
    // Le territoire ne recolore ni un mur ni une base : seules les cases
    // neutres en reçoivent la teinte.
    const isNeutralFloor = kind === undefined || kind === "empty";

    // En partie réelle, le serveur ne transmet qu'un « Spawn » générique sans
    // couleur (mapEditor.ts#wireTileToKind) : la case exacte à toucher pour
    // marquer serait invisible sans ça. On la peint dans la couleur pleine du
    // joueur, comme le fait déjà l'éditeur pour ses tuiles « spawn-N ».
    const exactBase = isNeutralFloor
      ? bases.find((b) => b.x === tile.x && b.y === tile.y)
      : undefined;

    const color = exactBase
      ? exactBase.color
      : isNeutralFloor && bases.length > 0
        ? applyTerritoryTint(baseColor, tile.x, tile.y, bases, isWallAt)
        : baseColor;

    return {
      x: tile.x,
      y: tile.y,
      color,
      height: blockHeight,
      centerY: -FLOOR_HEIGHT + blockHeight / 2,
    };
  });
}

/**
 * Les 4 directions de déplacement (voir directionFacing) nommées comme
 * elles se voient réellement à l'écran une fois passées par la caméra
 * isométrique (voir computeIsometricFrame) — RIGHT/DOWN/LEFT/UP en case de
 * plateau, mais SE/SW/NW/NE une fois affichées en diagonale à l'écran.
 */
export type Facing = "ne" | "nw" | "se" | "sw";

/**
 * Direction affichée par le canard (voir organisms/DuckSprite.vue) : le
 * déplacement se fait par téléportation case par case (pas d'interpolation
 * continue), donc pas besoin d'angle intermédiaire — seulement l'une des 4
 * poses fixes correspondant à la dernière case franchie. `undefined` si
 * `dx`/`dy` sont tous les deux nuls (ne devrait pas arriver pour un vrai
 * déplacement, mais évite de forcer une face par défaut arbitraire).
 */
export function directionFacing(dx: number, dy: number): Facing | undefined {
  if (dx > 0) return "se";
  if (dx < 0) return "nw";
  if (dy > 0) return "sw";
  if (dy < 0) return "ne";
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
/**
 * Bornes d'une taille jouable saisie à la main dans l'éditeur (hors murs du
 * contour, comme les presets ci-dessous). Le maximum n'est pas une limite du
 * moteur mais du RENDU : BoardPreview dessine un mesh par case (voir
 * organisms/BoardPreview.vue), donc 30x30 jouable = ~1000 objets à l'écran,
 * déjà lourd sur mobile. Aller au-delà demandera un rendu instancié, pas
 * seulement de changer ce nombre.
 */
export const MIN_PLAYABLE_SIZE = 5;
export const MAX_PLAYABLE_SIZE = 30;

/** Valeur du sélecteur de taille quand la carte ne correspond à aucun preset. */
export const CUSTOM_SIZE_ID = "custom";

/** Vrai si une taille jouable saisie à la main est acceptable. */
export function isPlayableSize(value: number): boolean {
  return Number.isInteger(value) && value >= MIN_PLAYABLE_SIZE && value <= MAX_PLAYABLE_SIZE;
}

/** Ramène une taille saisie dans les bornes, pour un champ de saisie libre. */
export function clampPlayableSize(value: number): number {
  if (!Number.isFinite(value)) return MIN_PLAYABLE_SIZE;
  return Math.min(MAX_PLAYABLE_SIZE, Math.max(MIN_PLAYABLE_SIZE, Math.round(value)));
}

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
 *
 * `fit` est cette demi-hauteur, relative à la diagonale du plateau : plus il
 * est petit, plus le plateau remplit le cadre. La valeur par défaut laisse de
 * la marge autour, nécessaire EN PARTIE (les canards dépassent des cases, et
 * on ne veut pas jouer collé aux bords) mais inutile pour un simple aperçu.
 *
 * C'est le seul levier : réduire la hauteur du conteneur ne change rien, la
 * caméra orthographique montre toujours la même tranche de monde en vertical
 * et n'ajuste que les marges horizontales.
 */
export function computeIsometricFrame(width: number, height: number, fit = 0.62): CameraFrame {
  const centerX = width / 2;
  const centerZ = height / 2;
  const diagonal = Math.sqrt(width * width + height * height);
  const offset = diagonal * 0.7;

  return {
    position: [centerX + offset, offset, centerZ + offset],
    target: [centerX, 0, centerZ],
    up: [0, 1, 0],
    viewSize: diagonal * fit,
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

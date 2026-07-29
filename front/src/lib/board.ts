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

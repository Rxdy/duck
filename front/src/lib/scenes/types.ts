import type { Placement } from "./motion.js";

/**
 * Ce qu'on voit dans une scène : des décors posés sur un sol et des canards habillés qui y vivent.
 * Les positions sont données comme à l'écran (voir `at`) : `across` vers la droite, `depth` vers le bas.
 */
export interface SceneActor extends Placement {
  color: string;
  outfit: readonly string[];
}

export type SceneProp =
  | { kind: "tree"; x: number; z: number; height?: number }
  | {
      kind: "gift";
      x: number;
      z: number;
      color: string;
      ribbon: string;
      size?: number;
      turn?: number;
    }
  | { kind: "snowman"; x: number; z: number }
  | { kind: "sack"; x: number; z: number }
  | { kind: "cane"; x: number; z: number; turn?: number }
  | { kind: "lamppost"; x: number; z: number }
  | { kind: "sleigh"; x: number; z: number; turn?: number }
  | { kind: "drift"; x: number; z: number; radius?: number };

/** Un morceau de scène qu'on assemble : un sapin et ses cadeaux, le traîneau, le Père Noël... */
export interface Piece {
  props: readonly SceneProp[];
  actors: readonly SceneActor[];
}

/** Quelle page habille l'image : l'accueil, le classement, ou toutes les autres. */
export type PageKind = "accueil" | "classement" | "defaut";
/** Quel format d'écran : large (ordinateur, tablette couchée) ou haut (téléphone, tablette debout). */
export type Device = "paysage" | "portrait";

export const PAGES: readonly PageKind[] = ["accueil", "classement", "defaut"];
export const DEVICES: readonly Device[] = ["paysage", "portrait"];

/** Une image de fond : ce qu'on y voit, et la taille à laquelle elle est fabriquée. */
export interface Layout extends Piece {
  page: PageKind;
  device: Device;
  width: number;
  height: number;
  /** Largeur de l'image en cases du monde : plus c'est petit, plus tout paraît gros. */
  units: number;
}

/**
 * L'ensemble des images d'un événement pour une année (« noel-2026 »). L'année suivante a sa propre
 * édition, avec d'autres décors et d'autres canards ; tant qu'elle n'existe pas, la précédente sert.
 */
export interface Edition {
  id: string;
  event: string;
  year: number;
  /** Faut-il de la neige qui tombe sur l'image ? */
  snow: boolean;
  layouts: readonly Layout[];
}

const AZIMUTH = (40 * Math.PI) / 180;

/**
 * Un point du sol donné comme on le voit à l'écran : `across` vers la droite, `depth` vers le bas
 * (vers nous). Plus simple à composer que des coordonnées du monde, que la caméra met de biais.
 */
export function onScreen(across: number, depth: number): [number, number] {
  const s = Math.sin(AZIMUTH);
  const c = Math.cos(AZIMUTH);
  return [c * across + s * depth, -s * across + c * depth];
}

export const at = (across: number, depth: number) => {
  const [x, z] = onScreen(across, depth);
  return { x, z };
};

/** Réunit des morceaux en une seule liste de décors et de canards. */
export function combine(...pieces: Piece[]): Piece {
  return {
    props: pieces.flatMap((piece) => piece.props),
    actors: pieces.flatMap((piece) => piece.actors),
  };
}

/** Les couleurs des canards des joueurs : celles du jeu. */
export const RED = "#FF4D6D";
export const YELLOW = "#FFB100";
export const CYAN = "#00C2D1";
export const GREEN = "#3FC46B";

/** Vitesse de marche des canards, en cases par seconde. */
export const WALK = 0.6;

const GIFT_COLORS: [string, string][] = [
  ["#dc2626", "#fde047"],
  ["#2563eb", "#f8fafc"],
  ["#16a34a", "#fca5a5"],
  ["#9333ea", "#fde047"],
  ["#f59e0b", "#1d4ed8"],
  ["#14b8a6", "#fde047"],
  ["#e11d48", "#f8fafc"],
  ["#0ea5e9", "#f8fafc"],
];

/** Des cadeaux en tas autour d'un point (across, depth) : `n` pièces espacées de `spread` au plus. */
export function gifts(
  across: number,
  depth: number,
  n: number,
  spread = 1.4,
  seed = 0,
): SceneProp[] {
  return Array.from({ length: n }, (_, i) => {
    const [box, ribbon] = GIFT_COLORS[(i + seed) % GIFT_COLORS.length]!;
    const angle = (i + seed) * 2.4;
    const ring = 0.35 + ((i * 0.37 + seed * 0.21) % 1) * spread;
    return {
      kind: "gift" as const,
      ...at(across + Math.cos(angle) * ring, depth + Math.sin(angle) * ring * 0.8),
      color: box,
      ribbon,
      size: 0.38 + ((i * 0.29 + seed * 0.13) % 1) * 0.3,
      turn: Math.sin(angle),
    };
  });
}

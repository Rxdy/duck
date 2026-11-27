import type { Placement } from "./motion.js";

/**
 * Ce qu'on voit dans une scène : des décors posés sur une dalle et des canards habillés qui vivent
 * dessus. Les positions sont en cases, autour du centre de la dalle (x vers la droite de l'écran
 * en vue de dessus, z vers le bas).
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

/** Une scène pleine page : un sol qui couvre tout l'écran, des décors et des canards répartis dessus. */
export interface SceneDefinition {
  id: string;
  name: string;
  /** Côté du sol, en cases. */
  size: number;
  props: readonly SceneProp[];
  actors: readonly SceneActor[];
  snow: boolean;
}

const RED = "#FF4D6D";
const YELLOW = "#FFB100";
const CYAN = "#00C2D1";
const GREEN = "#3FC46B";

/**
 * Un point de la dalle donné comme on le voit à l'écran : `across` vers la droite, `depth` vers le bas
 * (vers nous). Plus simple à composer que des coordonnées du monde, que la caméra met de biais.
 */
const AZIMUTH = (40 * Math.PI) / 180;
export function onScreen(across: number, depth: number): [number, number] {
  const s = Math.sin(AZIMUTH);
  const c = Math.cos(AZIMUTH);
  return [c * across + s * depth, -s * across + c * depth];
}
const at = (across: number, depth: number) => {
  const [x, z] = onScreen(across, depth);
  return { x, z };
};

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

/** Des cadeaux en tas autour d'un point : (across, depth) du centre, puis `n` pièces espacées. */
function gifts(across: number, depth: number, n: number, spread = 1.4, seed = 0): SceneProp[] {
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

const SPEED = 0.6;

/**
 * Noël, sur tout le fond : le village de part et d'autre (sapins, traîneau, bonhommes de neige, le
 * Père Noël et ses lutins), et au milieu, derrière le contenu de la page, presque rien : des lampadaires
 * et des congères, pour que les listes restent lisibles.
 */
export const NOEL: SceneDefinition = {
  id: "noel",
  name: "Noël",
  snow: true,
  size: 54,
  props: [
    // ---------------------------------------------------------------- à gauche : le sapin et le traîneau
    { kind: "tree", ...at(-11.5, -4.5), height: 6 },
    { kind: "tree", ...at(-14.2, -10.5), height: 3.4 },
    { kind: "tree", ...at(-8.8, -11), height: 4.2 },
    { kind: "tree", ...at(-13.6, 9), height: 4.4 },
    { kind: "tree", ...at(-8.6, 13), height: 2.8 },
    { kind: "tree", ...at(-12.2, 14.5), height: 3.2 },
    ...gifts(-11.5, -2.4, 9, 1.8, 0),
    { kind: "sleigh", ...at(-10.2, 5.2), turn: 0 },
    { kind: "sack", ...at(-8.4, 4.4) },
    ...gifts(-12.6, 5.6, 3, 0.9, 3),
    { kind: "snowman", ...at(-13.4, 0.6) },
    { kind: "cane", ...at(-9.2, -1.2), turn: 0.4 },
    { kind: "cane", ...at(-9.0, -0.6), turn: -0.3 },
    { kind: "cane", ...at(-13.8, -2.6), turn: 0.2 },
    { kind: "drift", ...at(-14.2, 3.6), radius: 1 },
    { kind: "drift", ...at(-9, 9.5), radius: 0.9 },
    { kind: "drift", ...at(-13, -7), radius: 1.1 },
    { kind: "lamppost", ...at(-8, -8) },
    { kind: "lamppost", ...at(-7.6, 9.5) },
    // ---------------------------------------------------------------- à droite : le Père Noël et ses lutins
    { kind: "tree", ...at(10.5, -9), height: 5.2 },
    { kind: "tree", ...at(13.8, -11), height: 3.2 },
    { kind: "tree", ...at(8.8, 12.5), height: 3.6 },
    { kind: "tree", ...at(13.2, 11), height: 4.6 },
    { kind: "tree", ...at(14, 4.5), height: 2.6 },
    { kind: "sack", ...at(13, -2.6) },
    ...gifts(11.6, -2.8, 8, 1.6, 2),
    { kind: "snowman", ...at(13.6, 7.2) },
    { kind: "snowman", ...at(8.6, 6.4) },
    ...gifts(10.2, 9.2, 5, 1.1, 5),
    { kind: "cane", ...at(9.6, -6), turn: 0.5 },
    { kind: "cane", ...at(9.9, -5.6), turn: -0.2 },
    { kind: "cane", ...at(13.4, 2.2), turn: 0.4 },
    { kind: "drift", ...at(9, 1), radius: 1 },
    { kind: "drift", ...at(14.2, -6.4), radius: 1.1 },
    { kind: "drift", ...at(11.6, 13.6), radius: 0.9 },
    { kind: "lamppost", ...at(8, -7.5) },
    { kind: "lamppost", ...at(7.6, 10) },
    // ---------------------------------------------------------------- au milieu : presque rien
    { kind: "drift", ...at(-3, 14.5), radius: 1.2 },
    { kind: "drift", ...at(3.4, -14.5), radius: 1.2 },
    { kind: "drift", ...at(-1, -14), radius: 0.9 },
    { kind: "drift", ...at(2, 14.2), radius: 0.8 },
    { kind: "tree", ...at(-4.6, -15), height: 2.6 },
    { kind: "tree", ...at(5.2, 15), height: 2.4 },
    ...gifts(0.4, 14.8, 3, 0.9, 1),
  ],
  actors: [
    // Un lutin porte un cadeau vers le sapin.
    {
      color: GREEN,
      outfit: ["bonnet-lutin", "tunique-lutin", "cadeau"],
      ...at(-13.4, 2.8),
      heading: 0,
      phase: 1.5,
      behavior: { kind: "patrol", points: [[...onScreen(-10.4, 2.8)]], speed: SPEED, pause: 1.6 },
    },
    // Un autre danse devant le sapin.
    {
      color: YELLOW,
      outfit: ["bonnet-lutin", "tunique-lutin"],
      ...at(-9.6, -3.2),
      heading: -0.4,
      phase: 1.3,
      behavior: { kind: "dance" },
    },
    // Le canard en bonhomme de neige aide le vrai à tenir debout.
    {
      color: CYAN,
      outfit: ["seau", "carotte", "costume-neige", "balai"],
      ...at(-11.4, 0.4),
      heading: 0.8,
      phase: 2.1,
      behavior: { kind: "dance" },
    },
    // Un lutin charge le traîneau.
    {
      color: RED,
      outfit: ["bonnet-lutin", "tunique-lutin", "cadeau"],
      ...at(-11.6, 6.8),
      heading: 0.6,
      phase: 0.4,
      behavior: { kind: "idle" },
    },
    // Un ange veille sur les cadeaux.
    {
      color: GREEN,
      outfit: ["aureole", "ailes"],
      ...at(-8.6, 7.6),
      heading: -0.2,
      phase: 0.9,
      behavior: { kind: "hop", every: 2.6 },
    },
    // Le Père Noël, bonnet et écharpe, son sac derrière lui.
    {
      color: RED,
      outfit: ["noel", "echarpe", "ballon"],
      ...at(11.0, -1.0),
      heading: 0.5,
      behavior: { kind: "idle" },
    },
    // Un lutin saute de joie devant lui.
    {
      color: CYAN,
      outfit: ["bonnet-lutin", "tunique-lutin", "cadeau"],
      ...at(12.6, 0.8),
      heading: -0.5,
      phase: 0.4,
      behavior: { kind: "hop", every: 2.6 },
    },
    // Un yéti lance des boules de neige.
    {
      color: YELLOW,
      outfit: ["fourrure-yeti", "pelage-yeti", "boule-neige"],
      ...at(10.2, 4.6),
      heading: -0.7,
      phase: 1.1,
      behavior: { kind: "dance" },
    },
    // Un lutin rapporte un cadeau du sac vers le Père Noël.
    {
      color: GREEN,
      outfit: ["bonnet-lutin", "tunique-lutin", "cadeau"],
      ...at(14.6, -1.4),
      heading: 0,
      phase: 0.8,
      behavior: { kind: "patrol", points: [[...onScreen(12.4, -0.6)]], speed: SPEED, pause: 1.6 },
    },
    // Un canard au bonnet de Noël se dandine entre les bonshommes de neige.
    {
      color: RED,
      outfit: ["noel", "echarpe"],
      ...at(11, 7.4),
      heading: -0.3,
      phase: 2.5,
      behavior: { kind: "dance" },
    },
  ],
};

export const SCENES: Record<string, SceneDefinition> = { [NOEL.id]: NOEL };

/**
 * La scène de saison. Noël du 20 novembre au 6 janvier ; ailleurs, aucune scène (le décor classique
 * reste). `?scene=noel` dans l'adresse force une scène, pour la voir hors saison.
 */
export function sceneFor(date: Date, forced?: string | null): SceneDefinition | undefined {
  if (forced && SCENES[forced]) return SCENES[forced];
  const month = date.getMonth() + 1;
  const day = date.getDate();
  if ((month === 11 && day >= 20) || month === 12 || (month === 1 && day <= 6)) return NOEL;
  return undefined;
}

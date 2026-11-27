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
  | { kind: "cane"; x: number; z: number; turn?: number };

export interface Diorama {
  /** Place horizontale du centre de la dalle à l'écran : 0 = bord gauche, 1 = bord droit. */
  at: { x: number; y: number };
  size: number;
  props: readonly SceneProp[];
  actors: readonly SceneActor[];
}

export interface SceneDefinition {
  id: string;
  name: string;
  dioramas: readonly Diorama[];
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

export const NOEL: SceneDefinition = {
  id: "noel",
  name: "Noël",
  snow: true,
  dioramas: [
    {
      // À gauche : le sapin, les cadeaux à son pied, et ceux qui s'affairent autour.
      at: { x: 0.125, y: 0.55 },
      size: 5,
      props: [
        { kind: "tree", ...at(0.2, -0.5), height: 3.1 },
        // Deux petits sapins aux coins, des cannes en sucre, un tas de cadeaux de plus.
        { kind: "tree", ...at(-2.5, -1.2), height: 2.2 },
        { kind: "tree", ...at(2.6, -0.9), height: 1.7 },
        { kind: "cane", ...at(-0.1, 0.8), turn: 0.4 },
        { kind: "cane", ...at(1.5, 0.9), turn: -0.5 },
        {
          kind: "gift",
          ...at(2.3, 0.6),
          color: "#14b8a6",
          ribbon: "#fde047",
          size: 0.5,
          turn: 0.7,
        },
        {
          kind: "gift",
          ...at(2.3, 0.6),
          color: "#e11d48",
          ribbon: "#f8fafc",
          size: 0.3,
          turn: -0.2,
        },
        { kind: "gift", ...at(-1.4, 0.0), color: "#dc2626", ribbon: "#fde047", size: 0.55 },
        {
          kind: "gift",
          ...at(-0.6, 0.5),
          color: "#2563eb",
          ribbon: "#f8fafc",
          size: 0.45,
          turn: 0.4,
        },
        {
          kind: "gift",
          ...at(1.0, 0.4),
          color: "#16a34a",
          ribbon: "#fca5a5",
          size: 0.6,
          turn: -0.3,
        },
        { kind: "gift", ...at(1.8, -0.2), color: "#9333ea", ribbon: "#fde047", size: 0.42 },
        {
          kind: "gift",
          ...at(-2.2, -0.8),
          color: "#f59e0b",
          ribbon: "#1d4ed8",
          size: 0.42,
          turn: 0.2,
        },
      ],
      actors: [
        // Le lutin fait la navette d'un bout à l'autre de la dalle, un cadeau à la main.
        {
          color: GREEN,
          outfit: ["bonnet-lutin", "tunique-lutin", "cadeau"],
          ...at(-2.4, 1.9),
          heading: 0,
          behavior: { kind: "patrol", points: [[...onScreen(2.2, 1.9)]], speed: 0.6, pause: 1.6 },
        },
        // Un autre danse devant le sapin.
        {
          color: YELLOW,
          outfit: ["bonnet-lutin", "tunique-lutin"],
          ...at(1.3, 1.0),
          heading: -0.3,
          phase: 1.3,
          behavior: { kind: "dance" },
        },
      ],
    },
    {
      // À droite : le Père Noël, son sac, un bonhomme de neige et des lutins.
      at: { x: 0.875, y: 0.58 },
      size: 5,
      props: [
        { kind: "snowman", ...at(2.5, -0.3) },
        { kind: "tree", ...at(0.3, -1.3), height: 2.6 },
        { kind: "tree", ...at(-2.7, -1.3), height: 1.8 },
        { kind: "cane", ...at(1.2, -0.6), turn: 0.3 },
        { kind: "cane", ...at(1.4, -0.5), turn: -0.2 },
        { kind: "gift", ...at(-0.2, -0.5), color: "#7c3aed", ribbon: "#fde047", size: 0.5 },
        {
          kind: "gift",
          ...at(0.5, -0.2),
          color: "#16a34a",
          ribbon: "#fca5a5",
          size: 0.38,
          turn: 0.6,
        },
        { kind: "sack", ...at(-2.3, -0.4) },
        { kind: "gift", ...at(-1.2, -0.9), color: "#dc2626", ribbon: "#fde047", size: 0.45 },
        {
          kind: "gift",
          ...at(-2.9, 0.5),
          color: "#0ea5e9",
          ribbon: "#f8fafc",
          size: 0.5,
          turn: 0.5,
        },
      ],
      actors: [
        // Le Père Noël : bonnet et écharpe, il regarde autour de lui.
        {
          color: RED,
          outfit: ["noel", "echarpe", "ballon"],
          ...at(-0.5, 0.3),
          heading: 0.6,
          behavior: { kind: "idle" },
        },
        // Un lutin saute de joie.
        {
          color: CYAN,
          outfit: ["bonnet-lutin", "tunique-lutin", "cadeau"],
          ...at(0.5, 1.5),
          heading: -0.5,
          phase: 0.4,
          behavior: { kind: "hop", every: 2.6 },
        },
        // Un canard en bonhomme de neige, qui se dandine.
        {
          color: GREEN,
          outfit: ["seau", "carotte", "costume-neige", "balai"],
          ...at(1.9, 0.7),
          heading: -0.9,
          phase: 2.1,
          behavior: { kind: "dance" },
        },
        // Un lutin porte un cadeau du sac jusqu'au Père Noël.
        {
          color: YELLOW,
          outfit: ["bonnet-lutin", "tunique-lutin", "cadeau"],
          ...at(-3.2, 0.9),
          heading: 0,
          phase: 0.8,
          behavior: { kind: "patrol", points: [[...onScreen(-1.9, 0.9)]], speed: 0.6, pause: 1.6 },
        },
      ],
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

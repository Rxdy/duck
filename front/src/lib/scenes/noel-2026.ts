import {
  at,
  combine,
  CYAN,
  GREEN,
  gifts,
  onScreen,
  RED,
  WALK,
  YELLOW,
  type Edition,
  type Layout,
  type Piece,
} from "./types.js";

/**
 * Noël 2026. Chaque morceau se pose où on veut (x vers la droite, y vers le bas de l'écran) ; chaque
 * page et chaque format d'écran les assemble à sa façon, comme les pièces d'un décor. L'édition de
 * Noël 2027 aura ses propres morceaux : d'autres lieux, d'autres canards, d'autres gags.
 */

/** Le grand sapin, ses cadeaux, un lutin qui danse et un qui apporte un cadeau. */
const arbre = (x: number, y: number): Piece => ({
  props: [
    { kind: "tree", ...at(x, y - 2), height: 6 },
    ...gifts(x, y + 0.2, 9, 1.8, 0),
    { kind: "cane", ...at(x + 2.2, y + 1.2), turn: 0.4 },
    { kind: "cane", ...at(x + 2.5, y + 1.8), turn: -0.3 },
    { kind: "drift", ...at(x - 3, y + 2.4), radius: 1 },
  ],
  actors: [
    {
      color: YELLOW,
      outfit: ["bonnet-lutin", "tunique-lutin"],
      ...at(x + 1.9, y + 0.9),
      heading: -0.4,
      phase: 1.3,
      behavior: { kind: "dance" },
    },
    {
      color: GREEN,
      outfit: ["bonnet-lutin", "tunique-lutin", "cadeau"],
      ...at(x - 3.4, y + 3),
      heading: 0,
      phase: 1.5,
      behavior: {
        kind: "patrol",
        points: [[...onScreen(x - 0.4, y + 3)]],
        speed: WALK,
        pause: 1.6,
      },
    },
  ],
});

/** Le traîneau qu'on charge, son sac, un ange qui veille. */
const traineau = (x: number, y: number): Piece => ({
  props: [
    { kind: "sleigh", ...at(x, y) },
    { kind: "sack", ...at(x + 2.4, y - 0.8) },
    ...gifts(x - 2.2, y + 0.4, 3, 0.9, 3),
    { kind: "lamppost", ...at(x + 3.3, y + 1) },
  ],
  actors: [
    {
      color: RED,
      outfit: ["bonnet-lutin", "tunique-lutin", "cadeau"],
      ...at(x - 0.8, y + 1.7),
      heading: 0.6,
      phase: 0.4,
      behavior: { kind: "idle" },
    },
    {
      color: GREEN,
      outfit: ["aureole", "ailes"],
      ...at(x + 1.9, y + 2),
      heading: -0.2,
      phase: 0.9,
      behavior: { kind: "hop", every: 2.6 },
    },
  ],
});

/** Le Père Noël devant son sac, un lutin qui saute et un autre qui lui rapporte un cadeau. */
const perenoel = (x: number, y: number): Piece => ({
  props: [
    { kind: "sack", ...at(x + 2, y - 1.6) },
    ...gifts(x + 0.6, y - 1.8, 8, 1.6, 2),
    { kind: "cane", ...at(x - 2, y - 2.2), turn: 0.5 },
    { kind: "cane", ...at(x - 1.7, y - 1.9), turn: -0.2 },
    { kind: "drift", ...at(x + 3.4, y - 3.6), radius: 1.1 },
  ],
  actors: [
    {
      color: RED,
      outfit: ["noel", "echarpe", "ballon"],
      ...at(x, y),
      heading: 0.5,
      behavior: { kind: "idle" },
    },
    {
      color: CYAN,
      outfit: ["bonnet-lutin", "tunique-lutin", "cadeau"],
      ...at(x + 1.7, y + 1.7),
      heading: -0.5,
      phase: 0.4,
      behavior: { kind: "hop", every: 2.6 },
    },
    {
      color: GREEN,
      outfit: ["bonnet-lutin", "tunique-lutin", "cadeau"],
      ...at(x + 3.6, y - 0.4),
      heading: 0,
      phase: 0.8,
      behavior: {
        kind: "patrol",
        points: [[...onScreen(x + 1.5, y + 0.4)]],
        speed: WALK,
        pause: 1.6,
      },
    },
  ],
});

/** Les bonshommes de neige, vrai et déguisé, et un yéti qui lance des boules. */
const neige = (x: number, y: number): Piece => ({
  props: [
    { kind: "snowman", ...at(x, y) },
    { kind: "snowman", ...at(x + 3.2, y + 0.9) },
    ...gifts(x + 1.4, y + 3.4, 4, 1, 5),
    { kind: "drift", ...at(x - 2.6, y - 1.8), radius: 0.9 },
    { kind: "cane", ...at(x + 4.2, y - 0.4), turn: 0.4 },
  ],
  actors: [
    {
      color: CYAN,
      outfit: ["seau", "carotte", "costume-neige", "balai"],
      ...at(x - 1.8, y + 1.2),
      heading: 0.8,
      phase: 2.1,
      behavior: { kind: "dance" },
    },
    {
      color: YELLOW,
      outfit: ["fourrure-yeti", "pelage-yeti", "boule-neige"],
      ...at(x + 1.5, y + 2.4),
      heading: -0.7,
      phase: 1.1,
      behavior: { kind: "dance" },
    },
    {
      color: RED,
      outfit: ["noel", "echarpe"],
      ...at(x - 3, y + 3.2),
      heading: -0.3,
      phase: 2.5,
      behavior: { kind: "dance" },
    },
  ],
});

/** Quelques sapins et congères, pour remplir sans rien raconter. */
const sousbois = (x: number, y: number, size = 1): Piece => ({
  props: [
    { kind: "tree", ...at(x, y), height: 4.4 * size },
    { kind: "tree", ...at(x + 3.2 * size, y - 1.8), height: 3.2 * size },
    { kind: "tree", ...at(x - 2.8 * size, y - 2.6), height: 3.6 * size },
    { kind: "drift", ...at(x + 1, y + 1.8), radius: 1 },
    { kind: "lamppost", ...at(x + 4.4 * size, y + 1.4) },
  ],
  actors: [],
});

/** Presque rien : de quoi garder le sol vivant derrière le contenu. */
const calme = (x: number, y: number): Piece => ({
  props: [
    { kind: "drift", ...at(x, y), radius: 1.2 },
    { kind: "drift", ...at(x + 4, y + 0.6), radius: 0.9 },
    { kind: "lamppost", ...at(x - 3, y) },
    ...gifts(x + 1.5, y + 0.4, 3, 0.9, 1),
  ],
  actors: [],
});

const PAYSAGE = {
  page: "defaut",
  device: "paysage",
  width: 3200,
  height: 1800,
  units: 29,
} as const;
const PORTRAIT = {
  page: "defaut",
  device: "portrait",
  width: 1170,
  height: 2532,
  units: 14,
} as const;

const layout = (base: Omit<Layout, "props" | "actors">, ...pieces: Piece[]): Layout => ({
  ...base,
  ...combine(...pieces),
});

export const NOEL_2026: Edition = {
  id: "noel-2026",
  event: "noel",
  year: 2026,
  snow: true,
  layouts: [
    // ------------------------------------------------------------------ classement : deux colonnes au centre
    layout(
      { ...PAYSAGE, page: "classement" },
      arbre(-11.5, -2),
      traineau(-10.5, 8),
      sousbois(-12, -11),
      perenoel(11, -2),
      neige(9, 8),
      sousbois(12.5, -11),
      calme(-1, -14.5),
      calme(1, 14.5),
    ),
    layout(
      { ...PORTRAIT, page: "classement" },
      perenoel(-1.5, -23),
      sousbois(2, -14, 0.7),
      calme(0, -2),
      neige(-4, 11),
      arbre(0, 23),
    ),
    // ------------------------------------------------------------------ accueil : le village de l'autre côté
    layout(
      { ...PAYSAGE, page: "accueil" },
      perenoel(-11, -1),
      neige(-10, 9),
      sousbois(-12, -11, 0.9),
      arbre(11.5, -3),
      traineau(10, 8.5),
      sousbois(14.5, 15.5, 0.7),
      calme(0, -14.5),
      calme(0, 14.5),
    ),
    layout(
      { ...PORTRAIT, page: "accueil" },
      arbre(0, -23),
      neige(-4, -12),
      calme(0, 0),
      traineau(-1, 12),
      perenoel(1.5, 23),
    ),
    // ------------------------------------------------------------------ toutes les autres pages
    layout(
      { ...PAYSAGE, page: "defaut" },
      sousbois(-12.5, -10),
      traineau(-10.5, 3),
      arbre(-11, 12),
      arbre(11.5, -9),
      neige(9, 1),
      perenoel(11, 12),
      calme(0, -14.5),
      calme(0, 14.5),
    ),
    layout(
      { ...PORTRAIT, page: "defaut" },
      traineau(-1, -23),
      sousbois(2, -13, 0.7),
      calme(0, 0),
      arbre(-1, 14),
      neige(-4, 24),
    ),
  ],
};

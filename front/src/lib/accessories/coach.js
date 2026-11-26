/** Les affaires de Coincoin, le coach du tutoriel. Réservées : elles ne se gagnent pas. */
import { piece, tete, corps, main } from "./lot1.js";

const reserve = (p) => ({ ...p, reserve: true });
const visage = (id, nom, creer) => piece("visage", id, nom, creer);

export const PIECES_COACH = [
  tete("toque-diplome", "Toque de professeur", (o) => {
    o.habit(0.5, "#1f2937", 1.085, 0.14, 1.075, 0.43);
    o.box(0.56, 0.04, 0.56, "#111827", 0, 1.08, 0.07, 0, Math.PI / 4);
    o.cyl(0.04, 0.04, 0.035, "#ffcf3a", 0, 1.115, 0.07);
    o.box(0.27, 0.014, 0.014, "#ffcf3a", 0.135, 1.108, 0.07);
    o.box(0.014, 0.17, 0.014, "#ffcf3a", 0.27, 1.025, 0.07);
    o.cyl(0.02, 0.045, 0.09, "#ffcf3a", 0.27, 0.91, 0.07);
  }),
  visage("lunettes-rondes", "Lunettes rondes", (o) => {
    for (const x of [-0.108, 0.108]) o.tore(0.094, 0.014, "#7c4a21", x, 0.845, 0.292);
    o.box(0.04, 0.018, 0.018, "#7c4a21", 0, 0.87, 0.292);
    for (const x of [-0.248, 0.248]) o.box(0.02, 0.024, 0.38, "#7c4a21", x, 0.86, 0.1);
    for (const s of [-1, 1]) o.box(0.07, 0.02, 0.02, "#7c4a21", s * 0.22, 0.86, 0.292);
    o.habit(0.5, "#7c4a21", 1.045, 0.035, 1.035, 0.36);
  }),
  corps("sifflet", "Sifflet de coach", (o) => {
    for (const s of [-1, 1])
      o.box(0.028, 0.2, 0.012, "#facc15", s * 0.075, 0.47, 0.285, 0, 0, s * 0.62);
    o.cyl(0.062, 0.062, 0.07, "#e2e8f0", -0.01, 0.37, 0.31, Math.PI / 2);
    o.box(0.11, 0.045, 0.06, "#e2e8f0", 0.065, 0.405, 0.31);
    o.cyl(0.022, 0.022, 0.08, "#64748b", -0.01, 0.37, 0.31, Math.PI / 2);
    o.habit(0.15, "#facc15", 1.075, 0.04, 1.06, 0.38);
  }),
  main("baguette-prof", "Baguette de professeur", (m) => {
    m.cyl(0.016, 0.026, 0.72, "#a16207", 0.02, 0.26, 0, 0, 0, -0.18);
    m.boule(0.05, "#fde047", 0.085, 0.62, 0).material.emissive.set("#a98a00");
    m.cyl(0.034, 0.034, 0.12, "#111827", -0.008, 0.02, 0, 0, 0, -0.18);
  }),
  main("carte-parcours", "Carte du parcours", (m) => {
    m.box(0.32, 0.26, 0.02, "#fef3c7", 0.1, 0.2, 0.05, 0, -0.25);
    for (const [x, y] of [
      [0.0, 0.13],
      [0.05, 0.17],
      [0.1, 0.16],
      [0.14, 0.21],
    ])
      m.boule(0.016, "#2563eb", x, y, 0.075 + (x - 0.1) * 0.25, 1, 1, 0.4);
    for (const r of [0.75, -0.75])
      m.box(0.09, 0.022, 0.012, "#dc2626", 0.18, 0.26, 0.095, 0, -0.25, r);
    for (const x of [-0.065, 0.265])
      m.cyl(0.022, 0.022, 0.28, "#b45309", x, 0.2, 0.05 + (x - 0.1) * 0.25);
  }),
].map(reserve);

export const TENUES_COACH = [
  {
    id: "coach-prof",
    nom: "A · Professeur",
    pieces: ["toque-diplome", "lunettes-rondes", "noeud", "baguette-prof"],
  },
  {
    id: "coach-sportif",
    nom: "B · Coach sportif",
    pieces: ["casquette", "sifflet", "carte-parcours"],
  },
  {
    id: "coach-antennes",
    nom: "C · Il garde ses antennes",
    pieces: ["lunettes-rondes", "sifflet", "baguette-prof"],
  },
  { id: "coach-guide", nom: "D · Guide", pieces: ["cowboy", "sac", "carte-parcours"] },
];

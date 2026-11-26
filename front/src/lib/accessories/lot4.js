/** Lot 4 de la liste art/accessoires/THEMES.md. "peau" = la couleur du canard. */
import { piece, plaque, tete, corps, dos, main, habille, ceinture, coiffe } from "./lot1.js";

const visage = (id, nom, creer) => piece("visage", id, nom, creer);
/** Un cordon derrière la tête : sans lui, un accessoire de visage ne se voit pas de dos. */
const cordon = (o, couleur) => o.habit(0.5, couleur, 1.045, 0.05, 1.035, 0.35);

export const PIECES_LOT4 = [
  // ------------------------------------------------ ouvrier (casque et gilet déjà faits)
  visage("lunettes-chantier", "Lunettes de protection", (o) => {
    for (const x of [-0.105, 0.105]) {
      // Un cadre ajouré : une plaque pleine cacherait les yeux.
      for (const y of [0.768, 0.916]) o.box(0.18, 0.022, 0.022, "#facc15", x, y, 0.29);
      for (const dx of [-0.079, 0.079]) o.box(0.022, 0.17, 0.022, "#facc15", x + dx, 0.842, 0.29);
      o.box(0.138, 0.128, 0.004, "#bae6fd", x, 0.842, 0.296).material = o.mat("#bae6fd", {
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
      });
    }
    o.box(0.05, 0.035, 0.02, "#facc15", 0, 0.87, 0.292);
    cordon(o, "#facc15");
  }),
  main("marteau", "Marteau", (m) => {
    m.cyl(0.028, 0.034, 0.52, "#a16207", 0, 0.14, 0);
    m.box(0.26, 0.13, 0.13, "#64748b", 0.02, 0.45, 0);
    m.box(0.05, 0.15, 0.15, "#475569", 0.16, 0.45, 0);
    m.cone(0.055, 0.13, "#475569", -0.165, 0.45, 0, 0, 0, Math.PI / 2);
  }),

  // ------------------------------------------------ jardinier (chapeau de paille déjà fait)
  corps("tablier-jardin", "Tablier de jardinier", (o) => {
    o.habit(0.15, "#166534", 1.07, 0.55, 1.055);
    for (const s of [-1, 1]) o.box(0.045, 0.2, 0.014, "#14532d", s * 0.12, 0.47, 0.28);
    o.box(0.26, 0.13, 0.016, "#22c55e", 0, 0.3, 0.287);
    for (const [x, c] of [
      [-0.07, "#f472b6"],
      [0.07, "#facc15"],
    ]) {
      o.cyl(0.008, 0.008, 0.1, "#4ade80", x, 0.39, 0.292);
      o.boule(0.036, c, x, 0.45, 0.292, 1, 1, 0.6);
    }
    o.box(0.12, 0.05, 0.016, "#14532d", 0, 0.3, -0.345);
  }),
  main("arrosoir", "Arrosoir", (m) => {
    m.cyl(0.14, 0.15, 0.24, "#38bdf8", 0.07, 0.12, 0.05);
    m.tore(0.12, 0.022, "#0284c7", 0.07, 0.25, 0.05, Math.PI);
    m.cyl(0.025, 0.04, 0.28, "#38bdf8", 0.24, 0.2, 0.05, 0, 0, -0.9);
    m.cyl(0.065, 0.04, 0.05, "#0284c7", 0.36, 0.295, 0.05, 0, 0, -0.9);
    for (const [x, y] of [
      [0.42, 0.25],
      [0.45, 0.17],
      [0.39, 0.15],
    ])
      m.boule(0.022, "#7dd3fc", x, y, 0.05, 0.8, 1.3, 0.8);
  }),

  // ------------------------------------------------ pixel rétro
  tete("casquette-pixel", "Casquette en cubes", (o) => {
    coiffe(o, "#7c3aed", 0.45, 0.09);
    for (let i = -2; i <= 2; i++)
      for (let k = -1; k <= 1; k++)
        o.box(
          0.095,
          0.095,
          0.11,
          (i + k) % 2 ? "#a78bfa" : "#7c3aed",
          i * 0.096,
          1.07,
          k * 0.112 + 0.07,
        );
    for (let i = -1; i <= 1; i++) o.box(0.095, 0.095, 0.11, "#5b21b6", i * 0.096, 1.165, 0.07);
    for (let i = -2; i <= 2; i++) o.box(0.095, 0.05, 0.11, "#facc15", i * 0.096, 1.02, 0.31);
  }),
  visage("lunettes-pixel", "Lunettes pixel", (o) => {
    const bloc = (x, y, c = "#0b0f19") => o.box(0.044, 0.044, 0.025, c, x, y, 0.292);
    for (let i = -5; i <= 5; i++) bloc(i * 0.045, 0.935);
    for (const s of [-1, 1]) {
      for (const dx of [1, 4]) for (const y of [0.89, 0.845]) bloc(s * dx * 0.046, y);
      for (const dx of [2, 3]) bloc(s * dx * 0.046, 0.8);
      bloc(s * 0.105, 0.89, "#f8fafc");
    }
    cordon(o, "#0b0f19");
  }),
  main("coeur-pixel", "Cœur en cubes", (m) => {
    const lignes = ["01010", "11111", "11111", "01110", "00100"];
    lignes.forEach((ligne, r) =>
      [...ligne].forEach((v, c) => {
        if (v === "1")
          m.box(
            0.072,
            0.072,
            0.072,
            r < 2 && c === 1 ? "#fecdd3" : "#e11d48",
            (c - 1.4) * 0.074,
            0.4 - r * 0.074,
            0.04,
          );
      }),
    );
  }),

  // ------------------------------------------------ skateur
  tete("casquette-envers", "Casquette à l'envers", (o) => {
    coiffe(o, "#111827", 0.45, 0.08);
    o.dome(0.262, "peau", 0, 1.0, 0.06, 0.66);
    o.box(0.34, 0.035, 0.24, "#111827", 0, 1.0, -0.23);
    o.box(0.17, 0.05, 0.02, "#f8fafc", 0, 1.035, 0.315);
    o.cyl(0.035, 0.035, 0.03, "#f8fafc", 0, 1.18, 0.06);
  }),
  corps("sweat-skate", "Sweat à poche", (o) => {
    habille(o, "peau");
    ceinture(o, "#111827", 0.19, 0.07);
    o.box(0.3, 0.12, 0.014, "#111827", 0, 0.31, 0.282);
    for (const s of [-1, 1]) {
      o.cyl(0.008, 0.008, 0.13, "#f8fafc", s * 0.06, 0.45, 0.29);
      o.boule(0.018, "#f8fafc", s * 0.06, 0.38, 0.29);
    }
    o.tore(0.15, 0.05, "#111827", 0, 0.56, -0.29, Math.PI, 0.5, 0, Math.PI);
  }),
  dos("planche-skate", "Planche à roulettes", (o) => {
    const angle = -0.32;
    const long = (d) => [-Math.sin(angle) * d, 0.52 + Math.cos(angle) * d];
    o.box(0.2, 0.78, 0.04, "#f97316", 0, 0.52, -0.43, 0, 0, angle);
    for (const d of [-0.39, 0.39]) {
      const [x, y] = long(d);
      o.cyl(0.1, 0.1, 0.04, "#f97316", x, y, -0.43, Math.PI / 2);
    }
    o.box(0.055, 0.74, 0.01, "#111827", 0, 0.52, -0.456, 0, 0, angle);
    for (const d of [-0.27, 0.27]) {
      const [x, y] = long(d);
      o.box(0.24, 0.045, 0.035, "#94a3b8", x, y, -0.475, 0, 0, angle);
      for (const s of [-1, 1])
        o.cyl(
          0.055,
          0.055,
          0.05,
          "#f8fafc",
          x + s * 0.13 * Math.cos(angle),
          y + s * 0.13 * Math.sin(angle),
          -0.485,
          Math.PI / 2,
        );
    }
  }),

  // ------------------------------------------------ anniversaire
  tete("chapeau-fete", "Chapeau pointu", (o) => {
    coiffe(o, "#facc15", 0.47, 0.05);
    o.cone(0.22, 0.46, "#ec4899", 0, 1.24, 0.07);
    for (const [y, r] of [
      [1.12, 0.17],
      [1.28, 0.095],
    ])
      o.tore(r, 0.022, "#facc15", 0, y, 0.07, Math.PI * 2, Math.PI / 2);
    o.boule(0.07, "#22d3ee", 0, 1.49, 0.07);
  }),
  corps("guirlande", "Écharpe de fête", (o) => {
    ceinture(o, "#facc15", 0.5, 0.1);
    const couleurs = ["#ec4899", "#22d3ee", "#4ade80", "#a78bfa"];
    for (let i = -3; i <= 3; i++)
      for (const z of [0.29, -0.352])
        o.cone(0.045, 0.1, couleurs[(i + 3) % 4], i * 0.075, 0.41, z, Math.PI);
  }),
  main("gateau", "Gâteau d'anniversaire", (m) => {
    m.cyl(0.2, 0.2, 0.03, "#e2e8f0", 0.08, 0.04, 0.07);
    m.cyl(0.16, 0.16, 0.13, "#f9a8d4", 0.08, 0.12, 0.07);
    m.cyl(0.165, 0.165, 0.04, "#fdf2f8", 0.08, 0.2, 0.07);
    m.cyl(0.11, 0.11, 0.08, "#92400e", 0.08, 0.26, 0.07);
    for (const dx of [-0.05, 0.05]) {
      m.cyl(0.014, 0.014, 0.11, "#60a5fa", 0.08 + dx, 0.355, 0.07);
      m.cone(0.025, 0.065, "#fde047", 0.08 + dx, 0.445, 0.07).material.emissive.set("#b45309");
    }
  }),

  // ------------------------------------------------ coccinelle
  tete("antennes-coccinelle", "Antennes de coccinelle", (o) => {
    coiffe(o, "#111827", 0.45, 0.09);
    for (const s of [-1, 1]) {
      o.cyl(0.016, 0.016, 0.28, "#111827", s * 0.15, 1.15, 0.12, 0.2, 0, -s * 0.35);
      o.boule(0.06, "#111827", s * 0.2, 1.29, 0.15);
    }
  }),
  corps("ventre-coccinelle", "Ventre de coccinelle", (o) => {
    habille(o, "#111827");
    ceinture(o, "peau", 0.52, 0.1);
    for (const y of [0.24, 0.36]) o.box(0.2, 0.025, 0.012, "peau", 0, y, 0.28);
  }),
  dos("carapace", "Carapace à points", (o) => {
    for (const s of [-1, 1]) {
      const aile = o.boule(0.3, "#dc2626", s * 0.14, 0.4, -0.39, 0.62, 1.05, 0.42);
      aile.rotation.z = s * 0.22;
      for (const [x, y] of [
        [0.1, 0.55],
        [0.21, 0.41],
        [0.1, 0.29],
      ])
        o.boule(0.045, "#111827", s * x, y, -0.515, 1, 1, 0.3);
    }
    o.boule(0.12, "#111827", 0, 0.65, -0.35, 1.3, 0.7, 0.7);
  }),

  // ------------------------------------------------ dragon
  tete("cornes-dragon", "Cornes et crête de dragon", (o) => {
    coiffe(o, "peau-sombre", 0.45, 0.09);
    for (const s of [-1, 1]) {
      o.cyl(0.05, 0.085, 0.2, "#fef3c7", s * 0.18, 1.1, 0.04, -0.35, 0, -s * 0.35);
      o.cone(0.05, 0.22, "#fde68a", s * 0.23, 1.26, -0.04, -0.75, 0, -s * 0.3);
    }
    for (let i = 0; i < 4; i++)
      o.cone(
        0.06,
        0.15 - i * 0.015,
        "#f59e0b",
        0,
        1.1 - i * 0.13,
        0.05 - i * 0.08,
        -0.25 - i * 0.35,
      );
  }),
  corps("ecailles-dragon", "Poitrail d'écailles", (o) => {
    habille(o, "peau");
    [0.45, 0.37, 0.29, 0.21].forEach((y, i) =>
      o.box(0.28 - i * 0.02, 0.06, 0.016, i % 2 ? "#fbbf24" : "#fde68a", 0, y, 0.283),
    );
    for (let i = 0; i < 4; i++)
      o.cone(0.05, 0.13, "#f59e0b", 0, 0.5 - i * 0.09, -0.37, -Math.PI / 2);
  }),
  dos("ailes-dragon", "Ailes de dragon", (o) => {
    for (const s of [-1, 1]) {
      const points = [
        [0, 0],
        [0.2, 0.34],
        [0.56, 0.46],
        [0.5, 0.22],
        [0.58, 0.02],
        [0.38, 0.1],
        [0.34, -0.12],
        [0.2, 0.03],
        [0.08, -0.14],
      ].map(([x, y]) => [s * x, y]);
      plaque(o, points, "peau-sombre", s * 0.16, 0.48, -0.37, 0.03, 0, s * 0.3, 0);
      o.cyl(0.018, 0.028, 0.68, "#f59e0b", s * 0.4, 0.71, -0.45, 0, s * 0.3, -s * 0.87);
    }
  }),

  // ------------------------------------------------ licorne
  tete("corne-licorne", "Corne et crinière", (o) => {
    coiffe(o, "#f8fafc", 0.45, 0.09);
    o.cone(0.085, 0.42, "#fbbf24", 0, 1.28, 0.17, 0.25);
    for (let i = 0; i < 3; i++)
      o.tore(
        0.062 - i * 0.015,
        0.012,
        "#fde68a",
        0,
        1.17 + i * 0.09,
        0.145 + i * 0.022,
        Math.PI * 2,
        Math.PI / 2 + 0.25,
      );
    for (const s of [-1, 1]) {
      o.cone(0.065, 0.17, "#f8fafc", s * 0.2, 1.12, 0.05, 0, 0, -s * 0.3);
      o.cone(0.035, 0.1, "#f9a8d4", s * 0.198, 1.12, 0.085, 0, 0, -s * 0.3);
    }
    ["#f472b6", "#fb923c", "#facc15", "#4ade80", "#38bdf8", "#a78bfa"].forEach((c, i) =>
      o.boule(
        0.105 - i * 0.006,
        c,
        0,
        1.08 - i * 0.105,
        -0.07 - Math.min(i, 2) * 0.055,
        0.85,
        1,
        1,
      ),
    );
  }),
  dos("queue-arc-en-ciel", "Queue arc-en-ciel", (o) => {
    ["#f472b6", "#fb923c", "#facc15", "#4ade80", "#38bdf8", "#a78bfa"].forEach((c, i) =>
      o.boule(
        0.1 + Math.sin((i / 5) * Math.PI) * 0.03,
        c,
        0.03 * i,
        0.38 - i * 0.025 + Math.sin(i * 0.8) * 0.05,
        -0.4 - i * 0.065,
      ),
    );
  }),

  // ------------------------------------------------ momie
  tete("bandelettes-tete", "Bandelettes de tête", (o) => {
    // Des tours séparés : la couleur du joueur passe entre les bandes, et les yeux restent libres.
    for (const [y, ep, c] of [
      [0.49, 0.09, "#e7dfc9"],
      [0.455, 0.045, "#cfc4a6"],
      [0.02, 0.1, "#e7dfc9"],
      [0.15, 0.07, "#cfc4a6"],
    ])
      o.habit(0.5, c, 1.075, ep, 1.065, y);
    o.box(0.5, 0.055, 0.012, "#e7dfc9", 0, 0.99, 0.27, 0, 0, 0.14);
    o.box(0.07, 0.36, 0.014, "#e7dfc9", 0.02, 0.82, -0.14, 0, 0, 0.5);
    o.box(0.06, 0.22, 0.016, "#cfc4a6", 0.27, 0.78, -0.06, 0.3, 0, 0.2);
  }),
  corps("bandelettes-corps", "Bandelettes", (o) => {
    for (const [y, c] of [
      [0.2, "#e7dfc9"],
      [0.29, "#cfc4a6"],
      [0.4, "#e7dfc9"],
      [0.5, "#cfc4a6"],
    ])
      ceinture(o, c, y, 0.065);
    for (const z of [0.29, -0.352]) o.box(0.07, 0.44, 0.012, "#e7dfc9", 0.02, 0.35, z, 0, 0, 0.7);
    o.box(0.06, 0.2, 0.014, "#cfc4a6", -0.23, 0.17, 0.29, 0, 0, -0.35);
  }),
  main("scarabee", "Scarabée d'or", (m) => {
    m.boule(0.14, "#d4a017", 0.05, 0.15, 0.06, 0.85, 1.1, 0.55);
    m.boule(0.075, "#b45309", 0.05, 0.31, 0.06, 1, 0.8, 0.7);
    m.box(0.014, 0.28, 0.01, "#713f12", 0.05, 0.15, 0.14);
    for (const s of [-1, 1])
      for (const [y, a] of [
        [0.23, 0.5],
        [0.15, 0],
        [0.07, -0.5],
      ])
        m.box(0.12, 0.022, 0.022, "#713f12", 0.05 + s * 0.16, y, 0.06, 0, 0, s * a);
    m.boule(0.038, "#22d3ee", 0.05, 0.17, 0.14).material.emissive.set("#0e7490");
  }),

  // ------------------------------------------------ abeille
  tete("antennes-abeille", "Antennes d'abeille", (o) => {
    coiffe(o, "#111827", 0.45, 0.09);
    for (const s of [-1, 1]) {
      o.cyl(0.016, 0.016, 0.2, "#111827", s * 0.13, 1.12, 0.07, 0, 0, -s * 0.25);
      o.cyl(0.016, 0.016, 0.18, "#111827", s * 0.2, 1.27, 0.07, 0, 0, -s * 0.75);
      o.boule(0.065, "#facc15", s * 0.27, 1.33, 0.07);
    }
  }),
  corps("rayures-abeille", "Rayures d'abeille", (o) => {
    habille(o, "#facc15");
    for (const y of [0.24, 0.38]) ceinture(o, "#111827", y, 0.075);
    ceinture(o, "peau", 0.52, 0.1);
  }),
  dos("ailes-abeille", "Petites ailes et dard", (o) => {
    for (const s of [-1, 1]) {
      for (const [y, x, a, r] of [
        [0.66, 0.3, 0.7, 0.21],
        [0.46, 0.31, 0.15, 0.17],
      ]) {
        const aile = o.boule(r, "#e0f2fe", s * x, y, -0.38, 1.25, 0.62, 0.12);
        aile.rotation.z = s * a;
        aile.material = o.mat("#e0f2fe", { transparent: true, opacity: 0.72 });
      }
    }
    o.cone(0.06, 0.2, "#111827", 0, 0.24, -0.43, -Math.PI / 2);
  }),
  main("pot-miel", "Pot de miel", (m) => {
    m.cyl(0.13, 0.115, 0.21, "#d97706", 0.07, 0.12, 0.06);
    m.cyl(0.095, 0.13, 0.05, "#d97706", 0.07, 0.25, 0.06);
    m.cyl(0.105, 0.105, 0.045, "#fef3c7", 0.07, 0.295, 0.06);
    m.box(0.15, 0.1, 0.02, "#fef3c7", 0.07, 0.13, 0.195);
    m.boule(0.035, "#fbbf24", 0.17, 0.24, 0.12, 0.7, 1.6, 0.7);
  }),
];

const univers = (id, nom, pieces) => ({ id: `lot4-${id}`, nom, pieces });

export const THEMES_LOT4 = [
  univers("ouvrier", "Ouvrier", ["chantier", "lunettes-chantier", "gilet", "marteau"]),
  univers("jardinier", "Jardinier", ["paille", "tablier-jardin", "arrosoir"]),
  univers("pixel", "Pixel rétro", ["casquette-pixel", "lunettes-pixel", "coeur-pixel"]),
  univers("skateur", "Skateur", ["casquette-envers", "sweat-skate", "planche-skate"]),
  univers("anniversaire", "Anniversaire", ["chapeau-fete", "guirlande", "gateau"]),
  univers("coccinelle", "Coccinelle", ["antennes-coccinelle", "ventre-coccinelle", "carapace"]),
  univers("dragon", "Dragon", ["cornes-dragon", "ecailles-dragon", "ailes-dragon"]),
  univers("licorne", "Licorne", ["corne-licorne", "queue-arc-en-ciel"]),
  univers("momie", "Momie", ["bandelettes-tete", "bandelettes-corps", "scarabee"]),
  univers("abeille", "Abeille", [
    "antennes-abeille",
    "rayures-abeille",
    "ailes-abeille",
    "pot-miel",
  ]),
];

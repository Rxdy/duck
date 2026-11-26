/** Lot 5 : de nouvelles idées, au-delà de la première liste. "peau" = la couleur du canard. */
import { plaque, tete, corps, dos, main, habille, ceinture, coiffe } from "./lot1.js";

/** Les deux faces du torse : devant et derrière. */
const FACES = [0.28, -0.342];
/** Deux oreilles rondes ou pointues posées sur une coiffe : la base des animaux. */
const oreillesRondes = (o, couleur, interieur) => {
  for (const s of [-1, 1]) {
    o.boule(0.115, couleur, s * 0.21, 1.13, 0.07, 1, 1, 0.55);
    o.boule(0.06, interieur, s * 0.21, 1.13, 0.125, 1, 1, 0.35);
  }
};

export const PIECES_LOT5 = [
  // ------------------------------------------------ détective
  tete("casquette-detective", "Casquette de détective", (o) => {
    coiffe(o, "#8a6a45", 0.45, 0.09);
    o.dome(0.265, "#a07e55", 0, 1.03, 0.07, 0.68);
    for (const s of [-1, 1]) o.box(0.3, 0.03, 0.16, "#8a6a45", 0, 1.03, 0.07 + s * 0.28, s * 0.2);
    for (const x of [-0.14, 0, 0.14])
      o.box(0.02, 0.012, 0.4, "#6b4f31", x, 1.2 - Math.abs(x) * 0.3, 0.07);
    o.boule(0.045, "#6b4f31", 0, 1.22, 0.07);
    for (const s of [-1, 1]) o.box(0.03, 0.2, 0.16, "#8a6a45", s * 0.262, 0.93, 0.08);
  }),
  corps("impermeable", "Imperméable", (o) => {
    habille(o, "#c8a97e");
    ceinture(o, "peau", 0.52, 0.1);
    ceinture(o, "#6b4f31", 0.29, 0.07);
    o.box(0.08, 0.065, 0.016, "#ffcf3a", 0, 0.29, 0.287);
    for (const s of [-1, 1])
      o.box(0.07, 0.19, 0.016, "#a8895f", s * 0.085, 0.44, 0.287, 0, 0, s * 0.45);
    o.box(0.015, 0.14, 0.012, "#a8895f", 0, 0.2, -0.343);
  }),
  main("loupe", "Loupe", (m) => {
    m.cyl(0.03, 0.03, 0.2, "#5b3a1e", 0, 0.03, 0);
    m.tore(0.15, 0.028, "#ffcf3a", 0, 0.3, 0);
    m.cyl(0.135, 0.135, 0.012, "#bae6fd", 0, 0.3, 0, Math.PI / 2).material = m.mat("#bae6fd", {
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
    m.box(0.025, 0.1, 0.006, "#f8fafc", -0.055, 0.34, 0.012, 0, 0, -0.7);
  }),

  // ------------------------------------------------ boulanger
  tete("calot-boulanger", "Calot de boulanger", (o) => {
    coiffe(o, "#f8fafc", 0.43, 0.13);
    o.boule(0.27, "#f1f5f9", 0, 1.09, 0.05, 1.05, 0.5, 0.95);
    o.habit(0.5, "#d97706", 1.1, 0.03, 1.09, 0.44);
  }),
  corps("tablier-farine", "Tablier fariné", (o) => {
    o.habit(0.15, "#fef3c7", 1.07, 0.7, 1.055);
    for (const s of [-1, 1]) o.box(0.04, 0.16, 0.014, "#d97706", s * 0.12, 0.49, 0.28);
    for (const [x, y, r] of [
      [-0.12, 0.25, 0.04],
      [0.1, 0.4, 0.032],
      [0.05, 0.22, 0.024],
    ])
      o.boule(r, "#ffffff", x, y, 0.282, 1.3, 0.8, 0.2);
    o.box(0.2, 0.05, 0.014, "#d97706", 0, 0.32, -0.345);
  }),
  main("baguette-pain", "Baguette de pain", (m) => {
    m.cyl(0.075, 0.075, 0.66, "#d99a4e", 0.04, 0.27, 0.03, 0, 0, -0.16);
    for (const s of [-1, 1]) m.boule(0.075, "#d99a4e", 0.04 + s * 0.053, 0.27 + s * 0.325, 0.03);
    for (let i = -2; i <= 2; i++)
      m.box(0.1, 0.03, 0.02, "#f7d49a", 0.04 + i * 0.019, 0.27 + i * 0.115, 0.105, 0, 0, 0.45);
  }),

  // ------------------------------------------------ clown
  tete("perruque-clown", "Perruque de clown", (o) => {
    coiffe(o, "#f59e0b", 0.45, 0.07);
    const couleurs = ["#ef4444", "#f59e0b", "#facc15", "#22c55e", "#3b82f6", "#a855f7"];
    let i = 0;
    for (const [y, rayon, n] of [
      [1.04, 0.25, 9],
      [1.15, 0.17, 6],
      [1.23, 0.03, 2],
    ])
      for (let k = 0; k < n; k++, i++) {
        const a = (k / n) * Math.PI * 2;
        o.boule(0.1, couleurs[i % 6], Math.cos(a) * rayon, y, 0.04 + Math.sin(a) * rayon * 0.85);
      }
    for (const s of [-1, 1])
      for (const [y, z] of [
        [0.93, -0.04],
        [0.83, -0.08],
      ])
        o.boule(0.095, couleurs[(s + 3 + Math.round(y * 10)) % 6], s * 0.27, y, z);
  }),
  corps("collerette", "Collerette et boutons", (o) => {
    habille(o, "peau");
    for (let i = -4; i <= 4; i++)
      for (const z of [0.285, -0.347])
        o.boule(0.06, i % 2 ? "#facc15" : "#f8fafc", i * 0.058, 0.51, z, 1, 0.75, 0.5);
    [0.4, 0.3, 0.2].forEach((y, i) =>
      o.boule(0.042, ["#3b82f6", "#facc15", "#22c55e"][i], 0, y, 0.287, 1, 1, 0.6),
    );
  }),
  main("ballons-clown", "Bouquet de ballons", (m) => {
    [
      [-0.08, 0.66, "#ef4444"],
      [0.17, 0.75, "#3b82f6"],
      [0.13, 0.53, "#facc15"],
    ].forEach(([x, y, c]) => {
      m.cyl(0.006, 0.006, y, "#e2e8f0", x / 2, y / 2 - 0.02, 0, 0, 0, -Math.atan2(x, y));
      m.boule(0.12, c, x, y + 0.06, 0, 0.92, 1.12, 0.92);
    });
  }),

  // ------------------------------------------------ fantôme
  tete("drap-fantome", "Drap sur la tête", (o) => {
    o.habit(0.5, "#eef2ff", 1.12, 1.04, 1.06, -0.004);
    o.fenetre(0.19, 0.755, 0.965, 0.262, 0.09);
    o.dome(0.265, "#f8fafc", 0, 1.0, 0.05, 0.6);
    // Une mèche de drap qui flotte, et un liseré à la couleur du joueur autour du visage.
    o.cone(0.07, 0.2, "#f8fafc", 0.06, 1.2, 0.0, -0.3, 0, -0.5);
    for (const s of [-1, 1]) o.box(0.03, 0.22, 0.016, "peau", s * 0.205, 0.86, 0.266);
    for (const y of [0.755, 0.975]) o.box(0.44, 0.03, 0.016, "peau", 0, y, 0.266);
    o.box(0.05, 0.42, 0.016, "peau", 0, 0.79, -0.133);
  }),
  corps("drap-corps", "Drap flottant", (o) => {
    habille(o, "#eef2ff");
    ceinture(o, "peau", 0.51, 0.07);
    for (let i = -3; i <= 3; i++)
      for (const z of [0.27, -0.33])
        o.cone(0.055, 0.13 + (i % 2) * 0.03, "#eef2ff", i * 0.075, 0.13, z, Math.PI);
    for (const z of FACES) o.box(0.06, 0.28, 0.012, "peau", 0, 0.34, z);
  }),
  main("lanterne", "Lanterne", (m) => {
    m.tore(0.07, 0.014, "#334155", 0.07, 0.28, 0.05, Math.PI);
    m.cone(0.13, 0.09, "#334155", 0.07, 0.25, 0.05);
    m.cyl(0.09, 0.09, 0.17, "#a7f3d0", 0.07, 0.12, 0.05).material.emissive.set("#34a07a");
    for (const [x, z] of [
      [-0.09, 0],
      [0.09, 0],
      [0, 0.09],
      [0, -0.09],
    ])
      m.box(0.018, 0.17, 0.018, "#334155", 0.07 + x, 0.12, 0.05 + z);
    m.cyl(0.11, 0.11, 0.035, "#334155", 0.07, 0.02, 0.05);
  }),

  // ------------------------------------------------ grenouille
  tete("yeux-grenouille", "Capuche grenouille", (o) => {
    coiffe(o, "#22c55e", 0.43, 0.15);
    o.dome(0.26, "#22c55e", 0, 1.02, 0.07, 0.4);
    for (const s of [-1, 1]) {
      o.boule(0.12, "#22c55e", s * 0.16, 1.15, 0.12);
      o.boule(0.083, "#f8fafc", s * 0.16, 1.17, 0.2);
      o.boule(0.038, "#14532d", s * 0.16, 1.175, 0.278);
    }
  }),
  corps("ventre-grenouille", "Costume de grenouille", (o) => {
    habille(o, "#22c55e");
    ceinture(o, "peau", 0.52, 0.09);
    o.boule(0.16, "#d9f99d", 0, 0.32, 0.268, 1, 1.05, 0.18);
    for (const [x, y] of [
      [-0.13, 0.4],
      [0.1, 0.28],
      [0.03, 0.43],
      [-0.07, 0.23],
    ])
      o.boule(0.035, "#15803d", x, y, -0.34, 1.2, 0.9, 0.2);
  }),
  main("nenuphar", "Nénuphar fleuri", (m) => {
    m.cyl(0.21, 0.21, 0.03, "#16a34a", 0.09, 0.14, 0.07, 0.25);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      m.boule(
        0.07,
        "#f9a8d4",
        0.09 + Math.cos(a) * 0.075,
        0.22,
        0.07 + Math.sin(a) * 0.075,
        0.7,
        1.15,
        0.7,
      );
    }
    m.boule(0.05, "#facc15", 0.09, 0.25, 0.07);
  }),

  // ------------------------------------------------ panda
  tete("oreilles-panda", "Capuche panda", (o) => {
    coiffe(o, "#f8fafc", 0.43, 0.15);
    o.dome(0.26, "#f8fafc", 0, 1.02, 0.07, 0.42);
    oreillesRondes(o, "#111827", "#374151");
    for (const s of [-1, 1]) o.boule(0.07, "#111827", s * 0.2, 1.01, 0.26, 1.1, 0.8, 0.4);
  }),
  corps("costume-panda", "Costume de panda", (o) => {
    habille(o, "#f8fafc");
    ceinture(o, "#111827", 0.47, 0.13);
    ceinture(o, "peau", 0.54, 0.06);
    for (const s of [-1, 1])
      for (const z of FACES) o.boule(0.08, "#111827", s * 0.16, 0.19, z, 1.1, 0.85, 0.3);
    o.boule(0.08, "#111827", 0, 0.27, -0.37);
  }),
  main("bambou", "Bambou", (m) => {
    m.cyl(0.035, 0.035, 0.74, "#65a30d", 0.01, 0.23, 0);
    for (const y of [0.05, 0.26, 0.47]) m.cyl(0.046, 0.046, 0.028, "#3f6212", 0.01, y, 0);
    for (const [y, s] of [
      [0.47, 1],
      [0.26, -1],
      [0.6, -1],
    ])
      m.boule(0.1, "#84cc16", 0.01 + s * 0.105, y + 0.04, 0, 1.15, 0.3, 0.45).rotation.z = s * 0.5;
  }),

  // ------------------------------------------------ yéti
  tete("fourrure-yeti", "Fourrure de yéti", (o) => {
    coiffe(o, "#e0f2fe", 0.43, 0.13);
    for (const [x, y, z, r] of [
      [0, 1.09, 0.07, 0.15],
      [-0.17, 1.05, 0.14, 0.11],
      [0.17, 1.05, 0.14, 0.11],
      [-0.16, 1.04, -0.06, 0.12],
      [0.16, 1.04, -0.06, 0.12],
      [0, 0.94, -0.14, 0.15],
      [-0.27, 0.86, 0.02, 0.1],
      [0.27, 0.86, 0.02, 0.1],
      [-0.26, 0.72, 0.0, 0.08],
      [0.26, 0.72, 0.0, 0.08],
    ])
      o.boule(r, "#f0f9ff", x, y, z);
    for (const s of [-1, 1]) o.cone(0.055, 0.19, "#64748b", s * 0.2, 1.2, 0.08, 0, 0, -s * 0.55);
  }),
  corps("pelage-yeti", "Pelage de yéti", (o) => {
    o.habit(0.15, "#e0f2fe", 1.085, 0.62, 1.07);
    for (let i = -3; i <= 3; i++) {
      for (const z of [0.29, -0.352]) {
        o.cone(0.052, 0.12, "#f0f9ff", i * 0.075, 0.16, z, Math.PI);
        o.boule(0.056, "#f0f9ff", i * 0.075, 0.49, z, 1, 0.9, 0.5);
      }
    }
  }),
  main("boule-neige", "Boule de neige", (m) => {
    m.boule(0.17, "#f8fafc", 0.08, 0.16, 0.07);
    for (const [x, y] of [
      [-0.02, 0.24],
      [0.18, 0.1],
      [0.14, 0.27],
    ])
      m.boule(0.06, "#e0f2fe", x, y, 0.1);
  }),

  // ------------------------------------------------ renard
  tete("oreilles-renard", "Capuche renard", (o) => {
    coiffe(o, "#ea580c", 0.43, 0.15);
    for (const s of [-1, 1]) {
      o.cone(0.12, 0.27, "#ea580c", s * 0.18, 1.19, 0.07, 0, 0, -s * 0.22);
      o.cone(0.06, 0.16, "#fef3c7", s * 0.178, 1.17, 0.14, 0.05, 0, -s * 0.22);
      o.cone(0.045, 0.09, "#1f2937", s * 0.207, 1.3, 0.07, 0, 0, -s * 0.22);
    }
  }),
  dos("queue-renard", "Queue de renard", (o) => {
    const queue = o.boule(0.2, "#ea580c", 0.1, 0.4, -0.52, 0.85, 1.55, 0.85);
    queue.rotation.set(-0.7, 0, -0.35);
    const bout = o.boule(0.12, "#fef3c7", 0.2, 0.65, -0.72, 0.85, 1.3, 0.85);
    bout.rotation.set(-0.7, 0, -0.35);
    o.boule(0.09, "#ea580c", 0.02, 0.25, -0.38);
  }),
  corps("foulard-renard", "Foulard noué", (o) => {
    ceinture(o, "#15803d", 0.51, 0.09);
    plaque(
      o,
      [
        [-0.17, 0],
        [0.17, 0],
        [0, -0.2],
      ],
      "#16a34a",
      0,
      0.49,
      0.29,
      0.03,
    );
    o.boule(0.045, "#14532d", 0, 0.5, 0.31);
  }),

  // ------------------------------------------------ hot-dog
  tete("moutarde", "Coiffe moutarde", (o) => {
    coiffe(o, "#dc2626", 0.45, 0.09);
    for (let i = 0; i < 6; i++)
      o.boule(
        0.085,
        "#facc15",
        (i % 2 ? 1 : -1) * 0.07,
        1.07 + i * 0.012,
        -0.08 + i * 0.065,
        1.5,
        0.6,
        0.7,
      );
    o.cone(0.05, 0.14, "#facc15", 0.02, 1.2, 0.22, 0.5);
  }),
  corps("pain-hot-dog", "Pain à hot-dog", (o) => {
    habille(o, "peau");
    for (const s of [-1, 1]) {
      const pain = o.boule(0.2, "#e5a95a", s * 0.28, 0.46, -0.03, 0.62, 2.05, 1.05);
      pain.rotation.z = -s * 0.07;
      o.boule(0.11, "#f6cf8b", s * 0.315, 0.47, 0.08, 0.5, 2.6, 0.8);
    }
  }),
  main("ketchup", "Flacon de ketchup", (m) => {
    m.cyl(0.1, 0.11, 0.3, "#dc2626", 0.06, 0.14, 0.05);
    m.dome(0.1, "#dc2626", 0.06, 0.29, 0.05, 0.6);
    m.cone(0.05, 0.13, "#f8fafc", 0.06, 0.42, 0.05);
    m.box(0.13, 0.11, 0.02, "#fef3c7", 0.06, 0.14, 0.155);
  }),

  // ------------------------------------------------ apiculteur
  tete("chapeau-apiculteur", "Chapeau à voilette", (o) => {
    o.cyl(0.38, 0.38, 0.03, "#fef3c7", 0, 1.03, 0.07);
    o.dome(0.23, "#fde68a", 0, 1.04, 0.07, 0.75);
    o.cyl(0.232, 0.232, 0.045, "#d97706", 0, 1.07, 0.07);
    // La voilette : un filet clair et ses mailles, à travers lequel on voit le visage.
    const voile = o.cyl(0.37, 0.39, 0.3, "#e2e8f0", 0, 0.87, 0.07);
    voile.material = o.mat("#e2e8f0", {
      transparent: true,
      opacity: 0.14,
      depthWrite: false,
      side: 2,
    });
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      o.box(0.006, 0.3, 0.006, "#cbd5e1", Math.sin(a) * 0.38, 0.87, 0.07 + Math.cos(a) * 0.38);
    }
    o.tore(0.39, 0.01, "#d97706", 0, 0.72, 0.07, Math.PI * 2, Math.PI / 2);
  }),
  corps("combi-apiculteur", "Combinaison d'apiculteur", (o) => {
    habille(o, "#fef9c3");
    ceinture(o, "peau", 0.5, 0.12);
    ceinture(o, "peau", 0.2, 0.08);
    o.box(0.018, 0.3, 0.012, "#a16207", 0, 0.34, 0.285);
    for (const z of [-0.343]) o.box(0.16, 0.16, 0.012, "#fde047", 0, 0.34, z, 0, 0, Math.PI / 4);
  }),
  main("enfumoir", "Enfumoir", (m) => {
    m.cyl(0.095, 0.095, 0.22, "#94a3b8", 0.04, 0.12, 0.05);
    m.cone(0.095, 0.13, "#64748b", 0.04, 0.29, 0.05);
    m.box(0.07, 0.17, 0.1, "#7c4a21", -0.09, 0.12, 0.05);
    for (const [x, y, r] of [
      [0.08, 0.43, 0.055],
      [0.14, 0.53, 0.07],
      [0.12, 0.66, 0.085],
    ])
      m.boule(r, "#e2e8f0", x, y, 0.05).material = m.mat("#e2e8f0", {
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
      });
  }),
];

const univers = (id, nom, pieces) => ({ id: `lot5-${id}`, nom, pieces });

export const THEMES_LOT5 = [
  univers("detective", "Détective", ["casquette-detective", "impermeable", "loupe"]),
  univers("boulanger", "Boulanger", ["calot-boulanger", "tablier-farine", "baguette-pain"]),
  univers("clown", "Clown", ["perruque-clown", "collerette", "ballons-clown"]),
  univers("fantome", "Fantôme", ["drap-fantome", "drap-corps", "lanterne"]),
  univers("grenouille", "Grenouille", ["yeux-grenouille", "ventre-grenouille", "nenuphar"]),
  univers("panda", "Panda", ["oreilles-panda", "costume-panda", "bambou"]),
  univers("yeti", "Yéti", ["fourrure-yeti", "pelage-yeti", "boule-neige"]),
  univers("renard", "Renard", ["oreilles-renard", "foulard-renard", "queue-renard"]),
  univers("hotdog", "Hot-dog", ["moutarde", "pain-hot-dog", "ketchup"]),
  univers("apiculteur", "Apiculteur", ["chapeau-apiculteur", "combi-apiculteur", "enfumoir"]),
];

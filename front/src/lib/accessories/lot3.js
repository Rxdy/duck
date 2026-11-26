/** Lot 3 de la liste art/accessoires/THEMES.md. "peau" = la couleur du canard. */
import { plaque, tete, corps, dos, main, habille, ceinture, coiffe } from "./lot1.js";

/** Les deux faces du torse : devant et derrière. */
const FACES = [0.28, -0.342];

export const PIECES_LOT3 = [
  // ------------------------------------------------ policier
  tete("casquette-police", "Casquette de police", (o) => {
    o.cyl(0.255, 0.265, 0.07, "#111827", 0, 1.025, 0.07);
    o.cyl(0.33, 0.255, 0.12, "#1e3a8a", 0, 1.115, 0.07);
    o.cyl(0.332, 0.332, 0.02, "#172554", 0, 1.18, 0.07);
    o.box(0.34, 0.03, 0.17, "#0b0f19", 0, 1.0, 0.35, 0.22);
    o.cyl(0.266, 0.268, 0.022, "#ffcf3a", 0, 1.06, 0.07);
    o.cyl(0.065, 0.065, 0.03, "#ffcf3a", 0, 1.115, 0.37, Math.PI / 2);
  }),
  corps("uniforme-police", "Uniforme de police", (o) => {
    habille(o, "#1e3a8a");
    // Les épaules et les manches restent à la couleur du joueur.
    ceinture(o, "peau", 0.52, 0.1);
    ceinture(o, "#0b0f19", 0.23, 0.07);
    o.box(0.1, 0.07, 0.016, "#ffcf3a", 0, 0.23, 0.285);
    o.cyl(0.05, 0.05, 0.015, "#ffcf3a", -0.13, 0.4, 0.282, Math.PI / 2);
    o.box(0.34, 0.1, 0.012, "peau", 0, 0.37, -0.342);
    for (const y of [0.32, 0.39]) o.boule(0.018, "#e2e8f0", 0.03, y, 0.282);
  }),
  main("panneau-stop", "Panneau sens interdit", (m) => {
    m.cyl(0.022, 0.022, 0.46, "#cbd5e1", 0.02, 0.17, 0);
    m.cyl(0.19, 0.19, 0.035, "#f8fafc", 0.02, 0.55, 0, Math.PI / 2, Math.PI / 8);
    m.cyl(0.158, 0.158, 0.05, "#dc2626", 0.02, 0.55, 0, Math.PI / 2, Math.PI / 8);
    for (const z of [0.03, -0.03]) m.box(0.2, 0.055, 0.008, "#f8fafc", 0.02, 0.55, z);
  }),

  // ------------------------------------------------ peintre
  tete("beret", "Béret d'artiste", (o) => {
    coiffe(o, "#111827", 0.46, 0.07);
    o.boule(0.31, "#1f2937", -0.05, 1.07, 0.06, 1.05, 0.34, 1).rotation.z = 0.22;
    o.cyl(0.018, 0.018, 0.09, "#111827", -0.08, 1.18, 0.06, 0, 0, 0.25);
  }),
  corps("blouse-peintre", "Blouse tachée", (o) => {
    habille(o, "#f1f5f9");
    ceinture(o, "peau", 0.52, 0.1);
    const taches = [
      [-0.14, 0.4, "#2563eb", 0.05],
      [0.1, 0.27, "#facc15", 0.06],
      [0.16, 0.43, "#16a34a", 0.035],
      [-0.07, 0.23, "#dc2626", 0.045],
      [0.01, 0.36, "#9333ea", 0.03],
    ];
    for (const [x, y, c, r] of taches)
      for (const z of FACES) o.boule(r, c, x, y, z, 1.15, 0.85, 0.2);
  }),
  dos("palette", "Palette en bandoulière", (o) => {
    o.boule(0.28, "#c08a4a", -0.03, 0.4, -0.4, 1.15, 0.88, 0.14);
    o.boule(0.05, "#5b3a1e", -0.2, 0.34, -0.44, 1, 1, 0.3);
    [
      [-0.13, 0.52, "#dc2626"],
      [0.03, 0.55, "#facc15"],
      [0.17, 0.47, "#16a34a"],
      [0.18, 0.31, "#2563eb"],
      [0.03, 0.25, "#9333ea"],
    ].forEach(([x, y, c]) => o.boule(0.055, c, x, y, -0.435, 1, 1, 0.35));
  }),
  main("pinceau", "Pinceau géant", (m) => {
    m.cyl(0.032, 0.024, 0.5, "#b45309", 0, 0.1, 0);
    m.cyl(0.05, 0.045, 0.11, "#cbd5e1", 0, 0.4, 0);
    m.cyl(0.085, 0.055, 0.13, "#2563eb", 0, 0.52, 0);
    m.cone(0.085, 0.16, "#2563eb", 0, 0.66, 0);
  }),

  // ------------------------------------------------ scaphandrier
  tete("casque-scaphandre", "Casque de scaphandrier", (o) => {
    o.habit(0.5, "#b87333", 1.12, 1.04, 1.06, -0.006);
    // Le hublot à la couleur du joueur, cerclé de laiton : les yeux restent visibles.
    o.fenetre(0.19, 0.765, 0.955, 0.262, 0.09);
    for (const s of [-1, 1]) {
      o.box(0.035, 0.2, 0.03, "#e0a050", s * 0.205, 0.86, 0.275);
      o.cyl(0.085, 0.085, 0.05, "#e0a050", s * 0.275, 0.82, 0.07, 0, 0, Math.PI / 2);
      o.cyl(0.055, 0.055, 0.056, "#7dd3fc", s * 0.282, 0.82, 0.07, 0, 0, Math.PI / 2);
    }
    for (const y of [0.755, 0.965]) o.box(0.43, 0.035, 0.03, "#e0a050", 0, y, 0.275);
    o.dome(0.23, "#c8833f", 0, 1.015, 0.07, 0.55);
    // La coiffe arrière à la couleur du joueur.
    o.box(0.36, 0.3, 0.02, "peau", 0, 0.8, -0.135);
    o.cyl(0.06, 0.075, 0.07, "#e0a050", 0, 1.15, 0.07);
    for (let i = -2; i <= 2; i++) o.boule(0.022, "#f5c77e", i * 0.1, 0.6, -0.16);
  }),
  corps("combi-scaphandre", "Combinaison de plongée lourde", (o) => {
    habille(o, "peau");
    ceinture(o, "#b87333", 0.52, 0.11);
    ceinture(o, "#7c4a21", 0.24, 0.08);
    for (const z of FACES) {
      o.box(0.24, 0.12, 0.016, "peau-sombre", 0, 0.39, z);
      for (const x of [-0.14, 0.14]) o.boule(0.026, "#f5c77e", x, 0.52, z);
    }
  }),
  dos("reservoir-cuivre", "Réservoir et tuyau", (o) => {
    for (const x of [-0.11, 0.11]) {
      o.cyl(0.075, 0.075, 0.3, "#b87333", x, 0.35, -0.42);
      o.dome(0.075, "#e0a050", x, 0.5, -0.42);
    }
    o.tore(0.17, 0.026, "#334155", 0, 0.6, -0.34, Math.PI, 0, Math.PI / 2);
  }),
  main("harpon", "Harpon", (m) => {
    m.cyl(0.022, 0.022, 0.82, "#94a3b8", 0, 0.22, 0);
    m.cone(0.06, 0.17, "#e2e8f0", 0, 0.71, 0);
    for (const s of [-1, 1]) m.cone(0.028, 0.12, "#e2e8f0", s * 0.055, 0.6, 0, 0, 0, s * 2.45);
    m.cyl(0.04, 0.04, 0.12, "#7c4a21", 0, 0, 0);
  }),

  // ------------------------------------------------ nécromancien
  tete("capuche-necro", "Capuche d'ombre", (o) => {
    o.habit(0.5, "#17131f", 1.14, 1.04, 1.06, -0.004);
    o.fenetre(0.19, 0.755, 0.965, 0.262, 0.08);
    o.cone(0.24, 0.34, "#17131f", 0, 1.1, -0.02, -0.45);
    // Le liseré à la couleur du joueur dessine l'ouverture et la nuque.
    for (const s of [-1, 1]) o.box(0.03, 0.22, 0.02, "peau", s * 0.205, 0.86, 0.28);
    for (const y of [0.755, 0.975]) o.box(0.44, 0.03, 0.02, "peau", 0, y, 0.28);
    o.box(0.05, 0.4, 0.02, "peau", 0, 0.78, -0.15);
  }),
  corps("robe-necro", "Robe de nécromancien", (o) => {
    habille(o, "#1e1829");
    ceinture(o, "peau", 0.52, 0.08);
    ceinture(o, "peau", 0.18, 0.06);
    for (const z of FACES) {
      o.box(0.06, 0.3, 0.012, "peau", 0, 0.35, z);
      o.boule(0.055, "#e7e2d0", 0, 0.37, z, 1, 1, 0.35);
    }
  }),
  dos("cape-lambeaux", "Cape en lambeaux", (o) => {
    plaque(
      o,
      [
        [-0.25, 0],
        [0.25, 0],
        [0.36, -0.42],
        [0.24, -0.33],
        [0.15, -0.46],
        [0.05, -0.3],
        [-0.06, -0.44],
        [-0.17, -0.31],
        [-0.27, -0.45],
        [-0.34, -0.36],
      ],
      "peau",
      0,
      0.57,
      -0.39,
      0.025,
      0.2,
    );
    o.box(0.54, 0.055, 0.07, "peau", 0, 0.555, -0.355);
  }),
  main("baton-crane", "Bâton à crâne", (m) => {
    m.cyl(0.023, 0.03, 0.78, "#3b2a1e", 0, 0.2, 0);
    m.boule(0.12, "#ece7d5", 0, 0.7, 0, 1, 0.95, 0.95);
    m.box(0.12, 0.07, 0.1, "#ece7d5", 0, 0.59, 0.02);
    for (const x of [-0.045, 0.045])
      m.boule(0.033, "#4ade80", x, 0.7, 0.105).material.emissive.set("#15803d");
    for (const x of [-0.03, 0, 0.03]) m.box(0.01, 0.05, 0.01, "#3b2a1e", x, 0.58, 0.075);
  }),

  // ------------------------------------------------ ange (auréole et ailes déjà faites)
  corps("toge-ange", "Tunique céleste", (o) => {
    habille(o, "#f8fafc");
    ceinture(o, "peau", 0.5, 0.13);
    ceinture(o, "#ffcf3a", 0.3, 0.05);
    ceinture(o, "peau", 0.18, 0.055);
    for (const z of FACES) o.box(0.07, 0.34, 0.012, "peau", 0.06, 0.37, z, 0, 0, -0.55);
  }),
  main("harpe", "Petite harpe", (m) => {
    m.box(0.05, 0.42, 0.05, "#e0a82e", -0.07, 0.22, 0);
    m.box(0.34, 0.05, 0.05, "#e0a82e", 0.08, 0.04, 0, 0, 0, 0.12);
    m.tore(0.17, 0.028, "#ffcf3a", 0.07, 0.37, 0, Math.PI * 0.72, 0, 0, 0.35);
    m.cyl(0.026, 0.026, 0.34, "#e0a82e", 0.21, 0.23, 0, 0, 0, -0.12);
    for (let i = 0; i < 4; i++)
      m.cyl(0.006, 0.006, 0.38 - i * 0.04, "#f8fafc", -0.01 + i * 0.055, 0.25 - i * 0.012, 0);
  }),

  // ------------------------------------------------ chasseur spatial
  tete("casque-chasseur", "Casque à visière en T", (o) => {
    o.habit(0.5, "peau", 1.11, 1.04, 1.06, -0.004);
    o.dome(0.26, "#64748b", 0, 1.02, 0.07, 0.45);
    // La visière en T, au-dessus des yeux et le long du nez.
    o.box(0.47, 0.045, 0.03, "#0b0f19", 0, 0.968, 0.275);
    o.fenetre(0.19, 0.775, 0.945, 0.262);
    o.box(0.05, 0.2, 0.03, "#0b0f19", 0, 0.862, 0.28);
    for (const s of [-1, 1]) o.box(0.05, 0.24, 0.14, "#475569", s * 0.265, 0.83, 0.08);
    o.cyl(0.018, 0.018, 0.3, "#94a3b8", 0.28, 1.08, 0.04);
    o.boule(0.04, "#f43f5e", 0.28, 1.24, 0.04).material.emissive.set("#9f1239");
    o.box(0.46, 0.07, 0.02, "#475569", 0, 0.78, -0.145);
  }),
  corps("armure-chasseur", "Armure de chasseur", (o) => {
    habille(o, "#334155");
    ceinture(o, "peau", 0.5, 0.13);
    ceinture(o, "#a16207", 0.23, 0.08);
    for (const z of FACES) {
      for (const x of [-0.09, 0.09]) o.box(0.15, 0.13, 0.02, "peau", x, 0.37, z);
    }
    for (const s of [-1, 1]) o.boule(0.12, "peau", s * 0.29, 0.52, -0.03, 0.75, 0.55, 1.2);
  }),
  main("pistolet-spatial", "Pistolet à rayon", (m) => {
    m.box(0.07, 0.17, 0.07, "#334155", 0, 0.0, 0, 0.25);
    m.box(0.11, 0.12, 0.3, "#94a3b8", 0, 0.12, 0.08);
    m.cyl(0.04, 0.04, 0.19, "#cbd5e1", 0, 0.13, 0.31, Math.PI / 2);
    for (const z of [0.27, 0.33]) m.tore(0.055, 0.014, "#22d3ee", 0, 0.13, z);
    m.boule(0.045, "#22d3ee", 0, 0.13, 0.43).material.emissive.set("#0e7490");
  }),

  // ------------------------------------------------ boxeur
  tete("casque-boxe", "Protège-tête", (o) => {
    coiffe(o, "#111827", 0.43, 0.13);
    for (const s of [-1, 1]) {
      o.box(0.08, 0.3, 0.26, "#111827", s * 0.27, 0.83, 0.1);
      o.boule(0.085, "peau", s * 0.31, 0.82, 0.09, 0.4, 1, 1);
    }
    o.box(0.44, 0.09, 0.08, "#111827", 0, 0.975, 0.28);
    o.box(0.2, 0.035, 0.012, "#f8fafc", 0, 0.98, 0.325);
  }),
  corps("short-champion", "Ceinture de champion", (o) => {
    o.habit(0.15, "#111827", 1.072, 0.34, 1.056);
    ceinture(o, "#ffcf3a", 0.31, 0.09);
    for (const z of [0.29, -0.352]) {
      o.cyl(0.12, 0.12, 0.02, "#ffcf3a", 0, 0.31, z, Math.PI / 2);
      o.cyl(0.065, 0.065, 0.028, "#dc2626", 0, 0.31, z, Math.PI / 2);
    }
    for (const x of [-0.24, 0.24])
      for (const z of FACES) o.box(0.035, 0.15, 0.014, "#f8fafc", x, 0.21, z);
  }),
  main("gant-boxe", "Gant géant", (m) => {
    m.boule(0.2, "peau", 0.07, 0.14, 0.07, 1, 1.05, 1.1);
    m.boule(0.095, "peau", -0.07, 0.12, 0.19, 0.85, 1.15, 1);
    m.cyl(0.11, 0.1, 0.12, "#f8fafc", 0.02, -0.06, 0.03, 0, 0, -0.25);
    m.tore(0.11, 0.016, "#111827", 0.032, -0.02, 0.035, Math.PI * 2, Math.PI / 2, 0.25);
  }),

  // ------------------------------------------------ skieur
  tete("bonnet-ski", "Bonnet et masque de ski", (o) => {
    coiffe(o, "#f8fafc", 0.44, 0.1);
    o.dome(0.262, "peau", 0, 1.01, 0.06, 0.82);
    o.boule(0.085, "#f8fafc", 0, 1.26, 0.06);
    // Le masque relevé sur le front, avec sa sangle qui fait le tour.
    o.habit(0.5, "#111827", 1.12, 0.09, 1.1, 0.42);
    o.box(0.46, 0.13, 0.05, "#111827", 0, 1.01, 0.285);
    o.box(0.4, 0.09, 0.03, "#fb923c", 0, 1.01, 0.315).material.emissive.set("#7c2d12");
  }),
  corps("combi-ski", "Veste de ski", (o) => {
    habille(o, "peau");
    ceinture(o, "#f8fafc", 0.4, 0.07);
    ceinture(o, "#1d4ed8", 0.32, 0.07);
    ceinture(o, "#f8fafc", 0.55, 0.07);
    o.box(0.02, 0.36, 0.012, "#111827", 0, 0.36, 0.292);
  }),
  dos("skis", "Skis et bâtons", (o) => {
    for (const s of [-1, 1]) {
      o.box(0.095, 1.05, 0.035, "#1d4ed8", s * 0.1, 0.72, -0.43, 0, 0, s * 0.3);
      o.box(0.03, 0.9, 0.012, "#f8fafc", s * 0.1, 0.72, -0.452, 0, 0, s * 0.3);
      const x = s * 0.1 - s * Math.sin(0.3) * 0.56;
      o.box(0.095, 0.15, 0.035, "#facc15", x, 1.26, -0.4, 0.45, 0, s * 0.3);
      o.cyl(0.014, 0.014, 0.9, "#cbd5e1", s * 0.24, 0.66, -0.39, 0, 0, s * 0.13);
      o.cyl(0.06, 0.06, 0.012, "#111827", s * 0.185, 0.29, -0.39);
    }
  }),

  // ------------------------------------------------ Pâques
  tete("oreilles-lapin", "Oreilles de lapin", (o) => {
    o.habit(0.5, "#f9a8d4", 1.09, 0.06, 1.08, 0.45);
    for (const s of [-1, 1]) {
      const penche = -s * 0.24;
      o.boule(0.095, "#f8fafc", s * 0.15, 1.28, 0.07, 0.95, 3.1, 0.62).rotation.z = penche;
      o.boule(0.055, "#f9a8d4", s * 0.15, 1.28, 0.122, 0.9, 4.1, 0.25).rotation.z = penche;
    }
  }),
  corps("gilet-paques", "Gilet à nœud", (o) => {
    habille(o, "#fef3c7");
    ceinture(o, "peau", 0.52, 0.1);
    ceinture(o, "peau", 0.2, 0.1);
    for (const s of [-1, 1])
      o.cone(0.075, 0.15, "#f472b6", s * 0.085, 0.47, 0.29, 0, 0, s * (Math.PI / 2)).scale.z = 0.4;
    o.boule(0.038, "#db2777", 0, 0.47, 0.295);
    // La queue en pompon, de dos.
    o.boule(0.13, "#f8fafc", 0, 0.27, -0.39);
  }),
  main("panier-oeufs", "Panier d'œufs", (m) => {
    m.cyl(0.18, 0.13, 0.15, "#a86b2d", 0.07, 0.07, 0.07);
    for (const y of [0.04, 0.1])
      m.tore(0.162 + y * 0.2, 0.012, "#7c4a1c", 0.07, y, 0.07, Math.PI * 2, Math.PI / 2);
    m.tore(0.17, 0.018, "#a86b2d", 0.07, 0.14, 0.07, Math.PI);
    [
      [-0.02, 0.17, 0.1, "#60a5fa"],
      [0.13, 0.18, 0.12, "#f472b6"],
      [0.08, 0.19, 0.0, "#facc15"],
      [0.03, 0.2, 0.09, "#4ade80"],
    ].forEach(([x, y, z, c]) => m.boule(0.068, c, x, y, z, 0.85, 1.2, 0.85));
  }),

  // ------------------------------------------------ tennis
  tete("visiere-tennis", "Visière", (o) => {
    o.habit(0.5, "#f8fafc", 1.1, 0.1, 1.085, 0.44);
    o.box(0.46, 0.03, 0.22, "#16a34a", 0, 0.995, 0.37, 0.16);
    o.habit(0.5, "#16a34a", 1.11, 0.025, 1.095, 0.47);
  }),
  corps("polo-tennis", "Polo de tennis", (o) => {
    habille(o, "#f8fafc");
    ceinture(o, "peau", 0.5, 0.13);
    ceinture(o, "peau", 0.2, 0.09);
    ceinture(o, "#16a34a", 0.34, 0.035);
    for (const s of [-1, 1])
      o.box(0.11, 0.07, 0.015, "#f8fafc", s * 0.065, 0.53, 0.292, 0, 0, -s * 0.5);
  }),
  main("raquette", "Raquette et balle", (m) => {
    m.cyl(0.028, 0.028, 0.2, "#111827", 0, 0.02, 0);
    m.box(0.045, 0.14, 0.035, "#dc2626", 0, 0.18, 0);
    m.tore(0.15, 0.025, "#dc2626", 0, 0.43, 0).scale.y = 1.2;
    for (let i = -2; i <= 2; i++) {
      m.box(0.007, 0.33 - Math.abs(i) * 0.04, 0.007, "#f8fafc", i * 0.05, 0.43, 0);
      m.box(0.27 - Math.abs(i) * 0.035, 0.007, 0.007, "#f8fafc", 0, 0.43 + i * 0.062, 0);
    }
    m.boule(0.07, "#d9f99d", 0.2, 0.14, 0.1).material.emissive.set("#4d7c0f");
  }),
];

const univers = (id, nom, pieces) => ({ id: `lot3-${id}`, nom, pieces });

export const THEMES_LOT3 = [
  univers("police", "Policier", ["casquette-police", "uniforme-police", "panneau-stop"]),
  univers("peintre", "Peintre", ["beret", "blouse-peintre", "palette", "pinceau"]),
  univers("scaphandrier", "Scaphandrier", [
    "casque-scaphandre",
    "combi-scaphandre",
    "reservoir-cuivre",
    "harpon",
  ]),
  univers("necro", "Nécromancien", ["capuche-necro", "robe-necro", "cape-lambeaux", "baton-crane"]),
  univers("ange", "Ange", ["aureole", "toge-ange", "ailes", "harpe"]),
  univers("chasseur", "Chasseur spatial", [
    "casque-chasseur",
    "armure-chasseur",
    "jetpack",
    "pistolet-spatial",
  ]),
  univers("boxeur", "Boxeur", ["casque-boxe", "short-champion", "gant-boxe"]),
  univers("skieur", "Skieur", ["bonnet-ski", "combi-ski", "skis"]),
  univers("paques", "Pâques", ["oreilles-lapin", "gilet-paques", "panier-oeufs"]),
  univers("tennis", "Tennis", ["visiere-tennis", "polo-tennis", "raquette"]),
];

/** Lot 2 de la liste art/accessoires/THEMES.md. "peau" = la couleur du canard. */
import { plaque, tete, corps, dos, main, habille, ceinture, coiffe } from "./lot1.js";

export const PIECES_LOT2 = [
  // ------------------------------------------------ cuisinier (toque et tablier déjà faits)
  main("poele", "Poêle et crêpe", (m) => {
    m.cyl(0.024, 0.024, 0.3, "#1f2937", 0, 0.07, 0.02, 0.35);
    m.cyl(0.19, 0.15, 0.065, "#374151", 0.02, 0.27, 0.14, 0.2);
    m.cyl(0.155, 0.155, 0.015, "#e8b25c", 0.02, 0.31, 0.148, 0.2);
    m.cyl(0.12, 0.12, 0.014, "#f2c779", 0.05, 0.47, 0.17, 0.7, 0, 0.3);
  }),

  // ------------------------------------------------ mineur
  tete("casque-mine", "Casque à lampe", (o) => {
    o.dome(0.28, "#f59e0b", 0, 0.98, 0.07, 0.85);
    o.cyl(0.31, 0.31, 0.035, "#b45309", 0, 0.99, 0.07);
    o.cyl(0.09, 0.09, 0.08, "#374151", 0, 1.11, 0.33, Math.PI / 2);
    o.cyl(0.068, 0.068, 0.02, "#fef9c3", 0, 1.11, 0.38, Math.PI / 2).material.emissive.set(
      "#b59a10",
    );
    o.cone(0.13, 0.34, "#fef08a", 0, 1.11, 0.55, -Math.PI / 2).material = o.mat("#fef08a", {
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    });
  }),
  corps("salopette", "Salopette", (o) => {
    o.habit(0.15, "#3b5b8c", 1.065, 0.62, 1.05);
    for (const s of [-1, 1]) {
      o.box(0.055, 0.2, 0.012, "#2c4670", s * 0.13, 0.47, 0.277);
      o.box(0.055, 0.2, 0.012, "#2c4670", s * 0.13, 0.47, -0.338, 0, 0, s * 0.35);
      o.boule(0.024, "#fbbf24", s * 0.13, 0.4, 0.287);
    }
    o.box(0.18, 0.11, 0.012, "#2c4670", 0, 0.29, 0.279);
  }),
  main("pioche", "Pioche", (m) => {
    m.cyl(0.027, 0.032, 0.7, "#8a5a2e", 0, 0.17, 0);
    for (const s of [-1, 1]) {
      m.box(0.2, 0.065, 0.05, "#94a3b8", s * 0.095, 0.48 - 0.025, 0, 0, 0, -s * 0.28);
      m.cone(0.038, 0.13, "#cbd5e1", s * 0.235, 0.415, 0, 0, 0, -s * 1.85);
    }
  }),

  // ------------------------------------------------ légionnaire
  tete("casque-legion", "Casque de légionnaire", (o) => {
    coiffe(o, "#9aa7b8", 0.43, 0.16);
    o.dome(0.265, "#aab6c6", 0, 1.0, 0.07, 0.72);
    // La brosse en travers : ce qui le distingue du gladiateur.
    o.box(0.54, 0.06, 0.07, "#ffcf3a", 0, 1.2, 0.07);
    for (let i = -6; i <= 6; i++)
      o.box(
        0.045,
        0.2 - Math.abs(i) * 0.012,
        0.085,
        i % 2 ? "#dc2626" : "#b91c1c",
        i * 0.044,
        1.31 - Math.abs(i) * 0.012,
        0.07,
        0,
        0,
        -i * 0.05,
      );
    for (const s of [-1, 1]) o.box(0.04, 0.24, 0.16, "#8795a8", s * 0.262, 0.85, 0.13);
    o.box(0.54, 0.05, 0.14, "#8795a8", 0, 0.93, -0.17, -0.35);
  }),
  corps("lorica", "Cuirasse à lames", (o) => {
    habille(o, "peau");
    for (const y of [0.31, 0.39, 0.47]) ceinture(o, "#aab6c6", y, 0.12);
    ceinture(o, "#7c4a21", 0.22, 0.09);
    for (let i = -3; i <= 3; i++)
      for (const z of [0.285, -0.345]) o.box(0.05, 0.1, 0.015, "#8b5a2b", i * 0.07, 0.175, z);
  }),

  // ------------------------------------------------ mousquetaire
  tete("feutre-plume", "Chapeau à plume", (o) => {
    const bord = o.cyl(0.4, 0.4, 0.03, "#1f2937", 0, 1.015, 0.07, 0, 0, 0.1);
    bord.scale.set(1.05, 1, 0.95);
    o.cyl(0.18, 0.215, 0.18, "#263243", 0, 1.11, 0.07);
    o.cyl(0.2, 0.218, 0.045, "#ffcf3a", 0, 1.055, 0.07);
    // Une grande plume qui part en arrière.
    for (let i = 0; i < 7; i++) {
      const t = i / 6;
      const barbe = o.boule(
        0.095 - t * 0.035,
        i % 2 ? "#f8fafc" : "#e2e8f0",
        0.2 + t * 0.08,
        1.2 + Math.sin(t * Math.PI * 0.75) * 0.2,
        0.1 - t * 0.55,
        0.45,
        0.75,
        1.25,
      );
      barbe.rotation.x = -0.5 + t * 1.1;
    }
  }),
  corps("tabard", "Casaque de mousquetaire", (o) => {
    habille(o, "peau");
    for (const z of [0.278, -0.34]) {
      o.box(0.25, 0.37, 0.012, "#f8fafc", 0, 0.355, z);
      o.box(0.055, 0.25, 0.016, "peau", 0, 0.355, z);
      o.box(0.17, 0.055, 0.017, "peau", 0, 0.39, z);
    }
    ceinture(o, "#5b3a1e", 0.2, 0.1);
  }),
  main("rapiere", "Rapière", (m) => {
    m.cyl(0.022, 0.022, 0.13, "#5b3a1e", 0, -0.01, 0);
    m.dome(0.085, "#ffcf3a", 0, 0.06, 0, 0.75);
    m.cyl(0.012, 0.017, 0.62, "#e2e8f0", 0, 0.42, 0);
    m.cone(0.014, 0.07, "#e2e8f0", 0, 0.76, 0);
    m.tore(0.075, 0.012, "#ffcf3a", 0, -0.01, 0, Math.PI, 0, 0, -Math.PI / 2);
  }),

  // ------------------------------------------------ homme des cavernes
  tete("tignasse", "Tignasse et os", (o) => {
    coiffe(o, "#5b3416", 0.44, 0.17);
    for (const [x, y, z, r] of [
      [0, 1.05, 0.07, 0.16],
      [-0.17, 1.03, 0.12, 0.11],
      [0.17, 1.03, 0.12, 0.11],
      [-0.14, 1.02, -0.08, 0.13],
      [0.14, 1.02, -0.08, 0.13],
      [0, 0.93, -0.15, 0.15],
      [-0.22, 0.88, -0.04, 0.09],
      [0.22, 0.88, -0.04, 0.09],
    ]) {
      o.boule(r, "#6b3d1a", x, y, z);
    }
    o.cyl(0.032, 0.032, 0.48, "#f5efe0", 0, 1.2, 0.09, 0, 0, Math.PI / 2 - 0.18);
    for (const s of [-1, 1])
      for (const d of [-0.035, 0.035])
        o.boule(0.045, "#f5efe0", s * 0.245, 1.2 + s * 0.044 + d, 0.09);
  }),
  corps("peau-de-bete", "Peau de bête", (o) => {
    o.habit(0.15, "#d9953a", 1.07, 0.72, 1.055);
    for (let i = -3; i <= 3; i++)
      for (const z of [0.28, -0.34])
        o.cone(0.04, 0.09, "#d9953a", i * 0.07, 0.15 + 0.0, z, Math.PI);
    for (const [x, y] of [
      [-0.15, 0.37],
      [0.08, 0.27],
      [0.16, 0.4],
      [-0.04, 0.22],
      [-0.17, 0.24],
      [0.03, 0.39],
    ]) {
      for (const z of [0.279, -0.34]) o.boule(0.034, "#6b3d1a", x, y, z, 1.2, 0.85, 0.25);
    }
    o.box(0.09, 0.2, 0.014, "#d9953a", -0.14, 0.49, 0.278, 0, 0, 0.5);
    o.box(0.09, 0.2, 0.014, "#d9953a", -0.14, 0.49, -0.339, 0, 0, -0.5);
  }),
  main("massue", "Massue", (m) => {
    m.cyl(0.14, 0.032, 0.62, "#8a5a2e", 0, 0.2, 0);
    m.dome(0.14, "#8a5a2e", 0, 0.51, 0, 0.7);
    for (const [x, y, z] of [
      [0.11, 0.44, 0.05],
      [-0.1, 0.36, 0.06],
      [0.02, 0.52, 0.11],
      [-0.05, 0.46, -0.11],
    ])
      m.boule(0.045, "#6b4020", x, y, z);
  }),

  // ------------------------------------------------ diablotin (ailes de nuit déjà faites)
  tete("cornes-diable", "Cornes de diable", (o) => {
    coiffe(o, "peau-sombre", 0.475, 0.05);
    for (const s of [-1, 1]) {
      o.cyl(0.06, 0.085, 0.18, "#7f1d1d", s * 0.19, 1.07, 0.09, 0, 0, -s * 0.45);
      o.cone(0.06, 0.22, "#450a0a", s * 0.255, 1.23, 0.09, 0, 0, -s * 0.12);
    }
    for (const s of [-1, 1])
      o.box(0.15, 0.035, 0.012, "#1f2937", s * 0.1, 0.945, 0.275, 0, 0, s * 0.35);
  }),
  main("fourche", "Fourche", (m) => {
    m.cyl(0.021, 0.021, 0.74, "#3f0d12", 0, 0.2, 0);
    m.box(0.28, 0.045, 0.04, "#7f1d1d", 0, 0.58, 0);
    for (const x of [-0.12, 0, 0.12]) {
      m.cyl(0.019, 0.019, 0.17, "#7f1d1d", x, 0.67, 0);
      m.cone(0.045, 0.1, "#450a0a", x, 0.8, 0);
    }
  }),
  dos("queue-diable", "Queue fourchue et ailes", (o) => {
    for (const s of [-1, 1]) {
      plaque(
        o,
        [
          [0, 0],
          [s * 0.18, 0.22],
          [s * 0.45, 0.3],
          [s * 0.37, 0.14],
          [s * 0.4, 0.02],
          [s * 0.26, 0.05],
          [s * 0.2, -0.08],
          [s * 0.09, 0],
        ],
        "peau-sombre",
        s * 0.2,
        0.49,
        -0.36,
        0.025,
        0,
        s * 0.3,
        0,
      );
    }
    o.tore(0.2, 0.025, "peau-sombre", 0, 0.34, -0.5, Math.PI, 0, Math.PI / 2, Math.PI);
    plaque(
      o,
      [
        [0, 0.1],
        [-0.09, -0.05],
        [0, -0.01],
        [0.09, -0.05],
      ],
      "peau-sombre",
      0,
      0.38,
      -0.7,
      0.04,
      0,
      0,
      0,
    );
  }),

  // ------------------------------------------------ extraterrestre
  tete("antennes-alien", "Antennes à boules", (o) => {
    coiffe(o, "#4ade80", 0.475, 0.05);
    for (const s of [-1, 1]) {
      o.cyl(0.022, 0.022, 0.34, "#22c55e", s * 0.17, 1.16, 0.07, 0, 0, -s * 0.42);
      o.boule(0.085, "#a3e635", s * 0.245, 1.34, 0.07).material.emissive.set("#3f6212");
    }
    // Le troisième œil.
    o.boule(0.062, "#f8fafc", 0, 0.968, 0.268, 1, 0.85, 0.45);
    o.boule(0.029, "#14532d", 0, 0.968, 0.298, 1, 1, 0.5);
  }),
  corps("combi-alien", "Combinaison d'un autre monde", (o) => {
    habille(o, "peau-sombre");
    for (const y of [0.22, 0.49]) ceinture(o, "#a3e635", y, 0.075);
    for (const z of [0.28, -0.342]) {
      o.tore(0.085, 0.017, "#a3e635", 0, 0.355, z);
      o.boule(0.045, "peau", 0, 0.355, z, 1, 1, 0.35);
    }
    for (const s of [-1, 1]) o.boule(0.11, "#a3e635", s * 0.29, 0.52, -0.03, 0.7, 0.45, 1.15);
  }),
  main("soucoupe", "Soucoupe de poche", (m) => {
    m.cyl(0.007, 0.007, 0.3, "#a3e635", 0.04, 0.17, 0.03).material = m.mat("#bef264", {
      transparent: true,
      opacity: 0.45,
    });
    m.boule(0.2, "#cbd5e1", 0.07, 0.38, 0.03, 1, 0.3, 1);
    m.dome(0.095, "#7dd3fc", 0.07, 0.41, 0.03, 0.95);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      m.boule(
        0.024,
        "#fde047",
        0.07 + Math.cos(a) * 0.16,
        0.355,
        0.03 + Math.sin(a) * 0.16,
      ).material.emissive.set("#a98a00");
    }
  }),

  // ------------------------------------------------ basketteur
  tete("bandeau-sport", "Bandeau de sport", (o) => {
    coiffe(o, "#f8fafc", 0.43, 0.12);
    o.habit(0.5, "#ea580c", 1.1, 0.04, 1.085, 0.47);
  }),
  corps("debardeur", "Débardeur numéro 7", (o) => {
    habille(o, "peau");
    for (const y of [0.185, 0.52]) ceinture(o, "#f8fafc", y, 0.07);
    for (const s of [-1, 1])
      for (const z of [0.277, -0.338]) o.box(0.035, 0.34, 0.012, "#f8fafc", s * 0.2, 0.355, z);
    o.box(0.18, 0.045, 0.012, "#f8fafc", 0, 0.45, -0.341);
    o.box(0.048, 0.23, 0.012, "#f8fafc", 0.025, 0.34, -0.342, 0, 0, -0.42);
  }),
  main("basket", "Ballon de basket", (m) => {
    m.boule(0.2, "#ea580c", 0.09, 0.14, 0.07);
    for (const rot of [
      [0, 0, 0],
      [Math.PI / 2, 0, 0],
      [0, Math.PI / 2, 0],
    ])
      m.tore(0.201, 0.009, "#1f2937", 0.09, 0.14, 0.07, Math.PI * 2, ...rot);
  }),

  // ------------------------------------------------ surfeur
  tete("meche", "Mèche blonde", (o) => {
    coiffe(o, "#fbbf24", 0.46, 0.08);
    o.dome(0.24, "#fcd34d", 0, 1.0, 0.05, 0.55);
    for (const [x, r] of [
      [-0.12, 0.5],
      [-0.02, 0.2],
      [0.09, -0.25],
    ])
      o.cone(0.085, 0.26, "#fde68a", x, 1.12, 0.2, 0.9, 0, r);
  }),
  corps("collier-fleurs", "Collier de fleurs", (o) => {
    const couleurs = ["#f472b6", "#facc15", "#f8fafc", "#a78bfa", "#4ade80"];
    for (let i = -4; i <= 4; i++) {
      o.boule(
        0.048,
        couleurs[(i + 4) % 5],
        i * 0.056,
        0.48 - Math.cos(i * 0.36) * 0.11 + 0.08,
        0.285,
        1,
        1,
        0.6,
      );
      o.boule(0.048, couleurs[(i + 6) % 5], i * 0.056, 0.52, -0.34, 1, 1, 0.6);
    }
    o.habit(0.15, "#0ea5a4", 1.07, 0.3, 1.055);
    for (const x of [-0.14, 0, 0.14])
      for (const z of [0.285, -0.345]) o.boule(0.028, "#f8fafc", x, 0.21, z, 1, 1, 0.3);
  }),
  dos("surf", "Planche de surf", (o) => {
    const planche = o.boule(0.5, "#fef9c3", 0, 0.62, -0.42, 0.4, 1.02, 0.07);
    planche.rotation.z = 0.2;
    o.box(0.055, 0.82, 0.012, "peau", 0, 0.62, -0.458, 0, 0, 0.2);
    plaque(
      o,
      [
        [0, 0.07],
        [-0.05, -0.05],
        [0.05, -0.05],
      ],
      "#0ea5a4",
      0.14,
      0.32,
      -0.47,
      0.02,
    );
  }),

  // ------------------------------------------------ lutin
  tete("bonnet-lutin", "Bonnet de lutin", (o) => {
    coiffe(o, "#dc2626", 0.44, 0.11);
    o.cone(0.255, 0.36, "#16a34a", 0, 1.17, 0.06);
    o.cone(0.1, 0.28, "#16a34a", 0.12, 1.33, 0.06, 0, 0, -1.15);
    o.boule(0.06, "#ffcf3a", 0.27, 1.38, 0.06);
    for (const s of [-1, 1])
      o.cone(0.07, 0.2, "peau", s * 0.31, 0.89, 0.05, 0, 0, -s * 1.25).scale.z = 0.5;
  }),
  corps("tunique-lutin", "Tunique de lutin", (o) => {
    habille(o, "#16a34a");
    ceinture(o, "#7c2d12", 0.27, 0.12);
    o.box(0.1, 0.075, 0.02, "#ffcf3a", 0, 0.27, 0.285);
    for (let i = -3; i <= 3; i++)
      for (const z of [0.282, -0.343]) o.cone(0.045, 0.11, "#dc2626", i * 0.07, 0.49, z, Math.PI);
    ceinture(o, "#dc2626", 0.53, 0.07);
  }),
  main("cadeau", "Cadeau", (m) => {
    m.box(0.25, 0.22, 0.2, "#dc2626", 0.08, 0.13, 0.07);
    m.box(0.265, 0.05, 0.215, "#fde047", 0.08, 0.2, 0.07);
    m.box(0.05, 0.225, 0.215, "#fde047", 0.08, 0.13, 0.07);
    for (const s of [-1, 1]) m.tore(0.055, 0.018, "#fde047", 0.08 + s * 0.055, 0.28, 0.07);
  }),
];

const univers = (id, nom, pieces) => ({ id: `lot2-${id}`, nom, pieces });

export const THEMES_LOT2 = [
  univers("cuisinier", "Cuisinier", ["toque", "tablier", "poele"]),
  univers("mineur", "Mineur", ["casque-mine", "salopette", "sac", "pioche"]),
  univers("legionnaire", "Légionnaire", ["casque-legion", "lorica", "scutum", "epee"]),
  univers("mousquetaire", "Mousquetaire", ["feutre-plume", "tabard", "cape", "rapiere"]),
  univers("cavernes", "Homme des cavernes", ["tignasse", "peau-de-bete", "massue"]),
  univers("diablotin", "Diablotin", ["cornes-diable", "queue-diable", "fourche"]),
  univers("alien", "Extraterrestre", ["antennes-alien", "combi-alien", "soucoupe"]),
  univers("basket", "Basketteur", ["bandeau-sport", "debardeur", "basket"]),
  univers("surfeur", "Surfeur", ["meche", "collier-fleurs", "surf"]),
  univers("lutin", "Lutin", ["bonnet-lutin", "tunique-lutin", "cadeau"]),
];

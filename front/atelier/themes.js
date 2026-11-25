/**
 * Pièces de la deuxième série et tenues par thème. Les thèmes sont des clins
 * d'œil à des univers connus de tous (chevaliers, pirates, espace...) : aucun
 * personnage, logo ni nom protégé, pour pouvoir les publier sans souci.
 */
import * as T from "three";

/** Un objet tenu : la moufle, puis l'objet dessiné autour d'elle (poignée à l'origine, haut vers +y). */
function tenu(id, nom, dessiner) {
  return {
    id,
    nom,
    emplacement: "main",
    creer(o) {
      o.enMain(dessiner);
    },
  };
}

const piece = (emplacement, id, nom, creer, extra = {}) => ({
  id,
  nom,
  emplacement,
  creer,
  ...extra,
});
const tete = (id, nom, creer) => piece("tete", id, nom, creer, { sansAntennes: true });

export const NOUVEAUX = [
  // ---------------------------------------------------------------- main
  tenu("baguette", "Baguette magique", (m) => {
    m.cyl(0.018, 0.026, 0.46, "#6b4423", 0, 0.17, 0);
    m.add(new T.OctahedronGeometry(0.085), m.mat("#ffe23a", { emissive: "#8a6d00" }), 0, 0.46, 0);
    for (const [x, y] of [
      [0.12, 0.54],
      [-0.11, 0.5],
      [0.07, 0.38],
    ]) {
      m.add(new T.OctahedronGeometry(0.03), m.mat("#fff7ae", { emissive: "#8a6d00" }), x, y, 0);
    }
  }),
  tenu("epee", "Épée", (m) => {
    m.cyl(0.028, 0.028, 0.15, "#5b3a1e", 0, 0, 0);
    m.boule(0.042, "#ffcf3a", 0, -0.095, 0);
    m.box(0.24, 0.045, 0.07, "#ffcf3a", 0, 0.095, 0);
    m.box(0.09, 0.52, 0.03, "#dbe4ee", 0, 0.37, 0);
    m.cone(0.064, 0.11, "#dbe4ee", 0, 0.685, 0, 0, Math.PI / 4).scale.z = 0.35;
  }),
  tenu("lame-lumiere", "Épée de lumière", (m) => {
    m.cyl(0.035, 0.035, 0.18, "#475569", 0, 0, 0);
    m.cyl(0.042, 0.042, 0.04, "#cbd5e1", 0, 0.1, 0);
    m.cyl(0.034, 0.034, 0.6, "#bdf3ff", 0, 0.42, 0).material.emissive.set("#2aa9d6");
    m.boule(0.034, "#bdf3ff", 0, 0.72, 0).material.emissive.set("#2aa9d6");
  }),
  tenu("sabre", "Sabre de pirate", (m) => {
    m.cyl(0.028, 0.028, 0.14, "#3f2a17", 0, 0, 0);
    m.tore(0.085, 0.018, "#ffcf3a", 0, 0.03, 0, Math.PI, 0, 0, -Math.PI / 2);
    m.box(0.08, 0.3, 0.028, "#e2e8f0", 0.005, 0.23, 0, 0, 0, -0.06);
    m.box(0.09, 0.24, 0.028, "#e2e8f0", 0.05, 0.47, 0, 0, 0, -0.3);
  }),
  tenu("sceptre", "Sceptre", (m) => {
    m.cyl(0.022, 0.022, 0.56, "#ffcf3a", 0, 0.2, 0);
    m.boule(0.085, "#e11d48", 0, 0.54, 0);
    m.tore(0.095, 0.014, "#ffcf3a", 0, 0.54, 0);
    m.cone(0.025, 0.07, "#ffcf3a", 0, 0.66, 0);
  }),
  tenu("baton", "Bâton de mage", (m) => {
    m.cyl(0.026, 0.034, 0.85, "#7c5130", 0, 0.22, 0);
    m.tore(0.085, 0.024, "#7c5130", 0.01, 0.72, 0, Math.PI * 1.5, 0, 0, -0.4);
    m.boule(0.06, "#7dd3fc", 0.01, 0.72, 0).material.emissive.set("#1d6f94");
  }),
  tenu("hache", "Hache", (m) => {
    m.cyl(0.026, 0.03, 0.62, "#7c5130", 0, 0.2, 0);
    for (const s of [-1, 1]) {
      const lame = m.cyl(0.15, 0.15, 0.035, "#b8c4d2", s * 0.07, 0.44, 0, Math.PI / 2);
      lame.scale.set(0.8, 1, 1.05);
    }
    m.cyl(0.045, 0.045, 0.15, "#475569", 0, 0.44, 0);
  }),
  tenu("trident", "Trident", (m) => {
    m.cyl(0.02, 0.02, 0.72, "#d4a017", 0, 0.2, 0);
    m.box(0.26, 0.035, 0.035, "#ffcf3a", 0, 0.56, 0);
    for (const x of [-0.12, 0, 0.12]) {
      m.cyl(0.016, 0.016, 0.14, "#ffcf3a", x, 0.64, 0);
      m.cone(0.035, 0.08, "#ffcf3a", x, 0.74, 0);
    }
  }),
  tenu("bouclier", "Bouclier", (m) => {
    m.cyl(0.24, 0.24, 0.045, "#334e8c", 0.03, 0.08, 0.125, Math.PI / 2);
    m.tore(0.235, 0.025, "#cbd5e1", 0.03, 0.08, 0.15);
    m.box(0.05, 0.3, 0.02, "#ffcf3a", 0.03, 0.08, 0.16);
    m.box(0.24, 0.05, 0.02, "#ffcf3a", 0.03, 0.11, 0.162);
  }),
  tenu("torche", "Torche", (m) => {
    m.cyl(0.035, 0.022, 0.38, "#6b4423", 0, 0.12, 0);
    m.cyl(0.062, 0.045, 0.09, "#3f3f46", 0, 0.34, 0);
    m.cone(0.085, 0.22, "#ff7a1a", 0, 0.49, 0).material.emissive.set("#a43d00");
    m.cone(0.048, 0.14, "#ffe23a", 0, 0.46, 0.03).material.emissive.set("#a98a00");
  }),
  tenu("ballon", "Ballon", (m) => {
    m.cyl(0.006, 0.006, 0.55, "#cbd5e1", 0.03, 0.27, 0);
    m.boule(0.17, "#ef4444", 0.06, 0.68, 0, 1, 1.15, 1);
    m.cone(0.035, 0.05, "#ef4444", 0.045, 0.48, 0);
    m.boule(0.035, "#fecaca", 0.0, 0.74, 0.14);
  }),
  tenu("parapluie", "Parapluie", (m) => {
    m.cyl(0.016, 0.016, 0.7, "#334155", 0, 0.25, 0);
    m.dome(0.3, "#0ea5a4", 0, 0.54, 0, 0.55);
    m.cone(0.025, 0.08, "#334155", 0, 0.74, 0);
    m.tore(0.05, 0.016, "#334155", -0.05, -0.1, 0, Math.PI, 0, 0, Math.PI);
  }),
  tenu("fleur", "Fleur", (m) => {
    m.cyl(0.014, 0.014, 0.36, "#16a34a", 0, 0.13, 0);
    m.boule(0.07, "#16a34a", 0.07, 0.13, 0, 1, 0.35, 0.5);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      m.boule(0.065, "#f8fafc", Math.cos(a) * 0.09, 0.34 + Math.sin(a) * 0.09, 0, 1, 1, 0.45);
    }
    m.boule(0.055, "#ffcf3a", 0, 0.34, 0.03);
  }),
  tenu("citrouille", "Lanterne citrouille", (m) => {
    m.boule(0.15, "#f97316", 0.04, -0.01, 0.04, 1.15, 0.95, 1.05).material.emissive.set("#5a2400");
    m.cyl(0.022, 0.03, 0.07, "#3f6212", 0.04, 0.15, 0.04);
    for (const x of [-0.02, 0.1])
      m.cone(0.028, 0.045, "#fde047", x, 0.02, 0.2, Math.PI / 2).material.emissive.set("#a98a00");
    m.box(0.12, 0.025, 0.02, "#fde047", 0.04, -0.06, 0.196).material.emissive.set("#a98a00");
  }),

  // ---------------------------------------------------------------- tête
  tete("heaume", "Heaume de chevalier", (o) => {
    o.habit(0.5, "#9aa7b8", 1.08, 0.2, 1.07, 0.42);
    o.dome(0.255, "#aab6c6", 0, 1.005, 0.07, 0.7);
    o.box(0.04, 0.06, 0.46, "#ffcf3a", 0, 1.17, 0.07);
    for (let i = 0; i < 4; i++)
      o.boule(0.075 - i * 0.008, "#dc2626", 0, 1.25 + i * 0.035, 0.1 - i * 0.1);
    for (const x of [-0.255, 0.255]) o.box(0.045, 0.3, 0.2, "#8795a8", x, 0.85, 0.01);
    o.habit(0.5, "#8795a8", 1.07, 0.55, 0.3, 0.12).position.z = -0.075;
  }),
  tete("tricorne", "Tricorne", (o) => {
    o.cyl(0.4, 0.4, 0.035, "#1f2430", 0, 1.01, 0.07).geometry = new T.CylinderGeometry(
      0.43,
      0.43,
      0.035,
      3,
    );
    o.dome(0.215, "#262c3a", 0, 1.02, 0.07, 0.9);
    o.tore(0.213, 0.018, "#ffcf3a", 0, 1.045, 0.07, Math.PI * 2, Math.PI / 2);
    o.boule(0.05, "#f1f5f9", 0, 1.12, 0.27, 1, 1, 0.4);
  }),
  tete("viking", "Casque à cornes", (o) => {
    o.dome(0.27, "#8b97a8", 0, 0.975, 0.07, 0.85);
    o.cyl(0.278, 0.282, 0.07, "#5d6879", 0, 0.99, 0.07);
    o.box(0.05, 0.05, 0.5, "#5d6879", 0, 1.2, 0.07);
    for (const s of [-1, 1]) {
      o.cyl(0.055, 0.075, 0.15, "#f3ead7", s * 0.31, 1.07, 0.07, 0, 0, -s * 1.1);
      o.cone(0.055, 0.18, "#fdf8ea", s * 0.39, 1.18, 0.07, 0, 0, -s * 0.35);
    }
  }),
  tete("spatial", "Casque spatial", (o) => {
    const verre = o.mat("#bfe9ff", { transparent: true, opacity: 0.22, depthWrite: false });
    o.add(new T.SphereGeometry(0.43, 32, 24), verre, 0, 0.86, 0.1);
    o.tore(0.34, 0.045, "#e2e8f0", 0, 0.6, 0.08, Math.PI * 2, Math.PI / 2);
    o.box(0.04, 0.2, 0.012, "#f8fafc", -0.2, 1.02, 0.44, 0, 0, -0.7);
    o.cyl(0.012, 0.012, 0.16, "#94a3b8", 0.18, 1.31, 0.02);
    o.boule(0.035, "#ef4444", 0.18, 1.4, 0.02);
  }),
  tete("ninja", "Bandeau de ninja", (o) => {
    o.habit(0.5, "#1e293b", 1.08, 0.14, 1.068, 0.43);
    o.box(0.17, 0.07, 0.015, "#cbd5e1", 0, 0.99, 0.273);
    for (const s of [-1, 1])
      o.box(0.065, 0.34, 0.025, "#1e293b", s * 0.08, 0.86, -0.19, -0.45, 0, s * 0.3);
  }),
  tete("paille", "Chapeau de paille", (o) => {
    o.cyl(0.44, 0.46, 0.028, "#e8c873", 0, 1.01, 0.07);
    o.cyl(0.19, 0.225, 0.17, "#efd286", 0, 1.1, 0.07);
    o.cyl(0.215, 0.228, 0.055, "#dc2626", 0, 1.05, 0.07);
  }),
  tete("pharaon", "Coiffe de pharaon", (o) => {
    o.habit(0.5, "#ffcf3a", 1.09, 0.2, 1.08, 0.43);
    for (const s of [-1, 1]) {
      o.box(0.09, 0.52, 0.2, "#ffcf3a", s * 0.285, 0.8, 0.03, 0, 0, s * 0.17);
      for (const y of [0.9, 0.76, 0.62])
        o.box(
          0.095,
          0.045,
          0.205,
          "#2457c5",
          s * (0.285 + (0.8 - y) * 0.17),
          y,
          0.03,
          0,
          0,
          s * 0.17,
        );
    }
    o.box(0.44, 0.38, 0.07, "#ffcf3a", 0, 0.84, -0.15);
    for (const y of [0.94, 0.82, 0.7]) o.box(0.445, 0.045, 0.075, "#2457c5", 0, y, -0.152);
    o.cone(0.04, 0.13, "#2457c5", 0, 1.1, 0.25);
  }),
  tete("serretete", "Oreilles de chat", (o) => {
    o.habit(0.5, "#1f2937", 1.075, 0.05, 1.062, 0.47);
    for (const s of [-1, 1]) {
      o.cone(0.11, 0.2, "#1f2937", s * 0.15, 1.1, 0.07, 0, 0, -s * 0.2);
      o.cone(0.055, 0.11, "#f9a8d4", s * 0.15, 1.085, 0.14, 0, 0, -s * 0.2);
    }
  }),

  // ---------------------------------------------------------------- visage
  piece("visage", "masque-heros", "Masque de héros", (o) => {
    o.habit(0.5, "#111827", 1.062, 0.17, 1.045, 0.315);
    o.fenetre(0.19, 0.775, 0.905, 0.2605, 0.04);
  }),
  piece("visage", "visiere", "Visière futuriste", (o) => {
    const verre = o.mat("#22d3ee", { transparent: true, opacity: 0.62, emissive: "#0e7490" });
    o.add(new T.BoxGeometry(0.46, 0.15, 0.03), verre, 0, 0.845, 0.295);
    for (const x of [-0.248, 0.248]) o.box(0.03, 0.07, 0.4, "#0f172a", x, 0.85, 0.09);
    o.habit(0.5, "#0f172a", 1.045, 0.07, 1.035, 0.33);
  }),

  // ---------------------------------------------------------------- corps
  piece("corps", "plastron", "Armure", (o) => {
    o.habit(0.15, "#9aa7b8", 1.07, 0.95, 1.055);
    for (const y of [0.2, 0.5]) o.habit(0.15, "#5d6879", 1.085, 0.11, 1.068, y - 0.15);
    o.forme(
      [
        [-0.11, 0.47],
        [0.11, 0.47],
        [0, 0.26],
      ],
      "#334e8c",
      0.2775,
    );
    o.boule(0.035, "#ffcf3a", 0, 0.41, 0.285, 1, 1, 0.5);
    o.box(0.025, 0.26, 0.012, "#5d6879", 0, 0.36, -0.34);
    for (const x of [-0.29, 0.29]) o.boule(0.11, "#aab6c6", x, 0.52, -0.03, 0.75, 0.6, 1.25);
  }),
  piece("corps", "maillot", "Maillot numéroté", (o) => {
    o.habit(0.15, "#1d4ed8", 1.065, 0.95, 1.05);
    for (const x of [-0.17, 0.17]) o.box(0.055, 0.37, 0.006, "#f8fafc", x, 0.35, 0.274);
    // Un grand 1 dans le dos : la partie qu'on voit en jouant.
    o.box(0.055, 0.22, 0.012, "#f8fafc", 0.01, 0.36, -0.339);
    o.box(0.07, 0.04, 0.012, "#f8fafc", 0.045, 0.45, -0.339, 0, 0, -0.6);
    o.box(0.15, 0.035, 0.012, "#f8fafc", 0.01, 0.26, -0.339);
  }),
  piece("corps", "combinaison", "Combinaison spatiale", (o) => {
    o.habit(0.15, "#eef2f7", 1.07, 0.96, 1.055);
    o.habit(0.15, "#f97316", 1.085, 0.11, 1.068, 0.04);
    o.box(0.17, 0.11, 0.02, "#334155", 0, 0.36, 0.28);
    for (const [x, c] of [
      [-0.045, "#ef4444"],
      [0, "#22c55e"],
      [0.045, "#38bdf8"],
    ])
      o.boule(0.018, c, x, 0.36, 0.294);
    o.box(0.28, 0.2, 0.09, "#cbd5e1", 0, 0.38, -0.37);
    for (const x of [-0.07, 0.07]) o.cyl(0.035, 0.035, 0.18, "#94a3b8", x, 0.4, -0.43);
  }),

  // ---------------------------------------------------------------- dos
  piece("dos", "katana", "Sabres dans le dos", (o) => {
    for (const s of [-1, 1]) {
      o.box(0.05, 0.72, 0.03, "#111827", s * 0.02, 0.5, -0.37 - (s + 1) * 0.018, 0, 0, s * 0.65);
      o.box(0.056, 0.2, 0.038, "#b91c1c", -s * 0.24, 0.84, -0.37 - (s + 1) * 0.018, 0, 0, s * 0.65);
      o.cyl(0.05, 0.05, 0.02, "#ffcf3a", -s * 0.17, 0.745, -0.37 - (s + 1) * 0.018, 0, 0, s * 0.65);
    }
  }),
  piece("dos", "cape-rouge", "Grande cape rouge", (o) => {
    const geo = new T.PlaneGeometry(1, 1, 36, 16);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const u = p.getX(i);
      const t = 0.5 - p.getY(i);
      p.setXYZ(
        i,
        u * (0.52 + t * 0.46),
        0.58 - t * 0.5,
        -0.33 - t * 0.24 - Math.sin(u * Math.PI * 6) * 0.04 * t,
      );
    }
    geo.computeVertexNormals();
    o.add(geo, o.mat("#c81e1e", { side: T.DoubleSide }), 0, 0, 0);
    o.habit(0.15, "#f8fafc", 1.09, 0.13, 1.07, 0.37);
  }),
  piece("dos", "ailes-nuit", "Ailes de chauve-souris", (o) => {
    const contour = [
      [0, 0],
      [0.16, 0.2],
      [0.46, 0.28],
      [0.4, 0.14],
      [0.47, 0.02],
      [0.33, 0.04],
      [0.3, -0.1],
      [0.19, -0.02],
      [0.1, -0.13],
    ];
    for (const s of [-1, 1]) {
      const forme = new T.Shape();
      contour.forEach(([x, y], i) => (i ? forme.lineTo(s * x, y) : forme.moveTo(s * x, y)));
      o.add(
        new T.ShapeGeometry(forme),
        o.mat("#2e1a47", { side: T.DoubleSide }),
        s * 0.2,
        0.48,
        -0.36,
        0,
        s * 0.3,
        0,
      );
    }
  }),
];

/** Une tenue par univers : au plus une pièce par emplacement. */
const univers = (id, nom, pieces) => ({ id: `theme-${id}`, nom, pieces });

export const THEMES = [
  univers("chevalier", "Chevalier", ["heaume", "plastron", "epee", "cape-rouge"]),
  univers("garde", "Garde royal", ["heaume", "plastron", "bouclier"]),
  univers("roi", "Roi", ["couronne", "cape-rouge", "sceptre"]),
  univers("magie", "Apprenti sorcier", ["sorcier", "lunettes", "cape", "baguette"]),
  univers("mage", "Grand mage", ["sorcier", "baton", "cape"]),
  univers("capitaine", "Capitaine pirate", ["tricorne", "cacheoeil", "veste", "sabre"]),
  univers("galaxie", "Duel des étoiles", ["cagoule", "visiere", "cape", "lame-lumiere"]),
  univers("astronaute", "Astronaute", ["spatial", "combinaison", "jetpack"]),
  univers("viking", "Viking", ["viking", "plastron", "hache", "cape-rouge"]),
  univers("ocean", "Roi des mers", ["couronne", "trident", "echarpe"]),
  univers("sport", "Champion", ["casquette", "maillot", "ballon"]),
  univers("plage", "Vacances", ["paille", "soleil", "fleur"]),
  univers("halloween", "Nuit d'Halloween", ["sorcier", "ailes-nuit", "citrouille"]),
  univers("noel", "Réveillon", ["noel", "echarpe", "ballon"]),
  univers("aventure", "Explorateur", ["cowboy", "torche", "sac"]),
  univers("cyber", "Cyber", ["visiere", "combinaison", "jetpack", "lame-lumiere"]),
  univers("chat", "Chat de gouttière", ["serretete", "noeud", "parapluie"]),
  univers("justicier", "Justicier", ["masque-heros", "maillot", "cape-rouge"]),
];

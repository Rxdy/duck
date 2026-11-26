/**
 * Lot 1 de la liste art/accessoires/THEMES.md : dix thèmes, plus le ninja et le
 * pharaon refaits. Grandes silhouettes d'abord : c'est ce qui se lit en jeu.
 */
import * as T from "three";

export const piece = (emplacement, id, nom, creer, extra = {}) => ({
  id,
  nom,
  emplacement,
  creer,
  ...extra,
});
export const tete = (id, nom, creer) => piece("tete", id, nom, creer, { sansAntennes: true });
export const corps = (id, nom, creer) => piece("corps", id, nom, creer);
export const dos = (id, nom, creer) => piece("dos", id, nom, creer);
export const main = (id, nom, dessiner) => piece("main", id, nom, (o) => o.enMain(dessiner));

/** Une forme plate à partir de points, avec un peu d'épaisseur pour exister de côté. */
export function plaque(o, points, couleur, x, y, z, epaisseur = 0.03, ...rot) {
  const s = new T.Shape();
  points.forEach(([px, py], i) => (i ? s.lineTo(px, py) : s.moveTo(px, py)));
  const geo = new T.ExtrudeGeometry(s, { depth: epaisseur, bevelEnabled: false });
  geo.translate(0, 0, -epaisseur / 2);
  return o.add(geo, o.mat(couleur), x, y, z, ...rot);
}

export const habille = (o, couleur) => o.habit(0.15, couleur, 1.065, 0.95, 1.05);
export const ceinture = (o, couleur, y, ep = 0.09) =>
  o.habit(0.15, couleur, 1.082, ep, 1.064, y - 0.15);
export const coiffe = (o, couleur, y = 0.42, ep = 0.2) =>
  o.habit(0.5, couleur, 1.085, ep, 1.075, y);

export const PIECES_LOT1 = [
  // ------------------------------------------------ samouraï
  tete("kabuto", "Casque de samouraï", (o) => {
    coiffe(o, "#7f1d1d", 0.42, 0.18);
    o.dome(0.27, "#991b1b", 0, 1.0, 0.07, 0.8);
    for (let i = 0; i < 3; i++) {
      o.box(
        0.6 + i * 0.09,
        0.06,
        0.06,
        i % 2 ? "#111827" : "#991b1b",
        0,
        0.95 - i * 0.085,
        -0.17 - i * 0.04,
        -0.4,
      );
      for (const s of [-1, 1]) {
        o.box(
          0.06,
          0.07,
          0.34 - i * 0.04,
          i % 2 ? "#111827" : "#991b1b",
          s * (0.27 + i * 0.04),
          0.96 - i * 0.085,
          -0.01 - i * 0.03,
          0,
          0,
          s * 0.45,
        );
      }
    }
    // Le croissant doré : la signature, lisible même en petit.
    const croissant = o.tore(0.22, 0.034, "#ffcf3a", 0, 1.31, 0.24, Math.PI, 0, 0, Math.PI);
    croissant.scale.y = 1.05;
    o.boule(0.055, "#ffcf3a", 0, 1.09, 0.31, 1, 1, 0.6);
  }),
  corps("armure-laquee", "Armure laquée", (o) => {
    habille(o, "#991b1b");
    for (const y of [0.24, 0.33, 0.42]) ceinture(o, "#111827", y, 0.045);
    ceinture(o, "#ffcf3a", 0.515, 0.05);
    for (const s of [-1, 1]) {
      for (let i = 0; i < 3; i++)
        o.box(
          0.08,
          0.075,
          0.38,
          i % 2 ? "#111827" : "#b91c1c",
          s * (0.3 + i * 0.025),
          0.52 - i * 0.075,
          -0.03,
          0,
          0,
          s * 0.35,
        );
    }
  }),
  dos("banniere", "Bannière de guerre", (o) => {
    o.cyl(0.016, 0.016, 1.15, "#4b2e14", -0.17, 0.78, -0.39);
    o.box(0.3, 0.52, 0.02, "#f8fafc", -0.17, 1.08, -0.41);
    for (const z of [-0.398, -0.423])
      o.cyl(0.085, 0.085, 0.006, "#dc2626", -0.17, 1.12, z, Math.PI / 2);
    o.box(0.33, 0.03, 0.03, "#4b2e14", -0.17, 1.35, -0.41);
  }),
  main("katana-main", "Katana", (m) => {
    m.cyl(0.03, 0.03, 0.2, "#111827", 0, -0.01, 0);
    for (const y of [-0.06, 0, 0.06]) m.cyl(0.032, 0.032, 0.018, "#dc2626", 0, y, 0);
    m.cyl(0.07, 0.07, 0.025, "#ffcf3a", 0, 0.1, 0);
    m.box(0.06, 0.36, 0.022, "#eef2f7", 0.006, 0.29, 0, 0, 0, -0.04);
    m.box(0.058, 0.32, 0.022, "#eef2f7", 0.038, 0.6, 0, 0, 0, -0.17);
  }),

  // ------------------------------------------------ robot
  tete("tete-robot", "Tête de robot", (o) => {
    o.habit(0.5, "peau", 1.09, 1.03, 1.047, -0.003);
    for (const [ep, y] of [
      [0.13, 0.43],
      [0.1, -0.004],
    ])
      o.habit(0.5, "#94a3b8", 1.105, ep, 1.062, y);
    o.fenetre(0.19, 0.775, 0.945, 0.2597);
    o.box(0.42, 0.025, 0.012, "#22d3ee", 0, 0.962, 0.264).material.emissive.set("#0e7490");
    for (const s of [-1, 1]) {
      o.cyl(0.09, 0.09, 0.09, "#475569", s * 0.29, 0.84, 0.05, 0, 0, Math.PI / 2);
      o.cyl(
        0.04,
        0.04,
        0.11,
        "#22d3ee",
        s * 0.3,
        0.84,
        0.05,
        0,
        0,
        Math.PI / 2,
      ).material.emissive.set("#0e7490");
    }
    o.cyl(0.02, 0.02, 0.18, "#475569", 0, 1.12, 0.07);
    o.boule(0.065, "#ef4444", 0, 1.25, 0.07).material.emissive.set("#7f1d1d");
  }),
  corps("torse-robot", "Torse de robot", (o) => {
    habille(o, "peau");
    for (const y of [0.19, 0.52]) ceinture(o, "#94a3b8", y, 0.11);
    o.box(0.26, 0.17, 0.02, "#1e293b", 0, 0.34, 0.279);
    [
      ["#ef4444", -0.07],
      ["#facc15", 0],
      ["#22c55e", 0.07],
    ].forEach(([c, x]) => {
      o.boule(0.025, c, x, 0.37, 0.294).material.emissive.set(c);
    });
    o.box(0.18, 0.025, 0.01, "#22d3ee", 0, 0.3, 0.292);
    for (const x of [-0.18, 0.18])
      for (const y of [0.24, 0.46]) o.boule(0.022, "#e2e8f0", x, y, -0.337);
  }),
  dos("batterie", "Batterie dorsale", (o) => {
    o.box(0.32, 0.3, 0.14, "#334155", 0, 0.39, -0.41);
    for (let i = 0; i < 3; i++)
      o.box(0.22, 0.055, 0.015, "#22c55e", 0, 0.31 + i * 0.08, -0.487).material.emissive.set(
        "#15803d",
      );
    for (const x of [-0.09, 0.09]) o.cyl(0.03, 0.03, 0.06, "#cbd5e1", x, 0.57, -0.41);
  }),
  main("cle", "Clé géante", (m) => {
    m.box(0.065, 0.46, 0.04, "#cbd5e1", 0, 0.15, 0);
    m.tore(0.1, 0.042, "#cbd5e1", 0, 0.46, 0, Math.PI * 1.55, 0, 0, Math.PI * 0.73);
    m.tore(0.05, 0.026, "#cbd5e1", 0, -0.11, 0);
  }),

  // ------------------------------------------------ pompier (casque déjà fait)
  corps("veste-pompier", "Veste de pompier", (o) => {
    habille(o, "#1e293b");
    for (const y of [0.255, 0.43]) {
      ceinture(o, "#facc15", y, 0.1);
      ceinture(o, "#e5e7eb", y, 0.035);
    }
    for (const y of [0.33, 0.5]) o.boule(0.022, "#ffcf3a", 0, y, 0.282, 1, 1, 0.5);
  }),
  dos("bouteilles", "Bouteilles d'air", (o) => {
    for (const x of [-0.1, 0.1]) {
      o.cyl(0.09, 0.09, 0.34, "#facc15", x, 0.4, -0.42);
      o.dome(0.09, "#facc15", x, 0.57, -0.42);
      o.cyl(0.03, 0.03, 0.06, "#334155", x, 0.68, -0.42);
    }
    for (const y of [0.31, 0.5]) o.box(0.42, 0.04, 0.2, "#1f2937", 0, y, -0.41);
  }),
  main("lance", "Lance à incendie", (m) => {
    m.cyl(0.045, 0.045, 0.2, "#b91c1c", 0, 0.04, 0.03, 0.9);
    m.cyl(0.03, 0.055, 0.14, "#ffcf3a", 0, 0.14, 0.16, 0.9);
    m.tore(0.12, 0.035, "#b91c1c", -0.03, -0.1, -0.05, Math.PI * 1.2, 0, Math.PI / 2, Math.PI);
    for (let i = 0; i < 5; i++) {
      m.boule(
        0.035 + i * 0.008,
        "#7dd3fc",
        0.015 * i,
        0.22 + i * 0.075 - i * i * 0.006,
        0.27 + i * 0.07,
      );
    }
  }),

  // ------------------------------------------------ vampire
  tete("cheveux-vampire", "Cheveux gominés", (o) => {
    coiffe(o, "#111118", 0.45, 0.15);
    o.dome(0.245, "#16161f", 0, 1.01, 0.04, 0.4);
    o.forme(
      [
        [-0.19, 0.99],
        [0.19, 0.99],
        [0.16, 0.945],
        [0.07, 0.96],
        [0, 0.915],
        [-0.07, 0.96],
        [-0.16, 0.945],
      ],
      "#111118",
      0.2745,
    );
    for (const s of [-1, 1]) o.box(0.035, 0.2, 0.09, "#111118", s * 0.252, 0.87, 0.11);
  }),
  dos("cape-vampire", "Cape à haut col", (o) => {
    for (const [couleur, dz] of [
      ["peau", -0.016],
      ["peau-sombre", 0],
    ]) {
      const geo = new T.PlaneGeometry(1, 1, 36, 16);
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const u = p.getX(i);
        const t = 0.5 - p.getY(i);
        p.setXYZ(
          i,
          u * (0.54 + t * 0.52),
          0.58 - t * 0.5,
          -0.33 - t * 0.24 - Math.sin(u * Math.PI * 6) * 0.035 * t + dz,
        );
      }
      geo.computeVertexNormals();
      o.add(geo, o.mat(couleur, { side: T.DoubleSide }), 0, 0, 0);
    }
    // Le col dressé derrière la tête : deux grandes pointes.
    for (const s of [-1, 1]) {
      const col = [
        [0, 0],
        [s * 0.34, 0.06],
        [s * 0.4, 0.46],
        [s * 0.2, 0.22],
        [0, 0.17],
      ];
      plaque(o, col, "#111118", 0, 0.54, -0.2, 0.025, 0, s * 0.35, 0);
      plaque(
        o,
        col.map(([x, y]) => [x * 0.86, y * 0.86]),
        "peau",
        0,
        0.555,
        -0.182,
        0.006,
        0,
        s * 0.35,
        0,
      );
    }
  }),
  corps("gilet-vampire", "Gilet à jabot", (o) => {
    habille(o, "#18181f");
    o.forme(
      [
        [-0.13, 0.548],
        [0.13, 0.548],
        [0, 0.22],
      ],
      "#f8fafc",
      0.2735,
    );
    for (let i = 0; i < 3; i++)
      o.forme(
        [
          [-0.08 + i * 0.015, 0.5 - i * 0.075],
          [0.08 - i * 0.015, 0.5 - i * 0.075],
          [0, 0.42 - i * 0.075],
        ],
        "#e2e8f0",
        0.276 + i * 0.001,
      );
    o.boule(0.04, "#dc2626", 0, 0.5, 0.283, 1, 1, 0.5).material.emissive.set("#5f0f0f");
  }),
  main("chauve-souris", "Chauve-souris", (m) => {
    const avant = m.groupe.children.length;
    m.boule(0.075, "#3b2063", 0.04, 0.32, 0.04, 1, 1.2, 0.9);
    for (const s of [-1, 1]) {
      plaque(
        m,
        [
          [0, 0.03],
          [s * 0.1, 0.11],
          [s * 0.24, 0.1],
          [s * 0.18, 0.04],
          [s * 0.2, -0.03],
          [s * 0.12, 0],
          [s * 0.08, -0.07],
          [0, -0.04],
        ],
        "#4c2a80",
        0.04 + s * 0.04,
        0.33,
        0.04,
        0.02,
      );
      m.cone(0.025, 0.07, "#3b2063", 0.04 + s * 0.045, 0.43, 0.04);
      m.boule(0.016, "#fde047", 0.04 + s * 0.03, 0.34, 0.11).material.emissive.set("#a98a00");
    }
    // Plus petite et écartée : elle masquait le devant de la tenue.
    for (const partie of m.groupe.children.slice(avant)) {
      partie.position.set(
        0.04 + (partie.position.x - 0.04) * 0.72 + 0.1,
        0.32 + (partie.position.y - 0.32) * 0.72 + 0.08,
        0.04 + (partie.position.z - 0.04) * 0.72 - 0.06,
      );
      partie.scale.multiplyScalar(0.72);
    }
  }),

  // ------------------------------------------------ bonhomme de neige
  tete("seau", "Seau sur la tête", (o) => {
    o.cyl(0.2, 0.27, 0.3, "#475569", 0, 1.13, 0.06, 0, 0, -0.12);
    o.cyl(0.285, 0.285, 0.035, "#94a3b8", -0.018, 0.985, 0.06, 0, 0, -0.12);
    o.cyl(0.245, 0.252, 0.05, "#94a3b8", 0.008, 1.2, 0.06, 0, 0, -0.12);
    o.tore(0.27, 0.014, "#cbd5e1", -0.015, 0.99, 0.06, Math.PI, 0, 0, Math.PI);
  }),
  piece("visage", "carotte", "Nez carotte", (o) => {
    o.cone(0.065, 0.34, "#f97316", 0, 0.79, 0.52, Math.PI / 2);
    for (const z of [0.46, 0.54]) o.tore(0.045 - (z - 0.46) * 0.25, 0.006, "#c2540c", 0, 0.79, z);
  }),
  corps("costume-neige", "Costume de neige", (o) => {
    habille(o, "#f8fafc");
    for (const y of [0.4, 0.31, 0.22]) o.boule(0.032, "#1f2937", 0, y, 0.281, 1, 1, 0.6);
    ceinture(o, "#dc2626", 0.505, 0.18);
    o.box(0.12, 0.24, 0.035, "#dc2626", 0.15, 0.39, 0.29, 0, 0, 0.1);
    o.box(0.122, 0.035, 0.04, "#fecaca", 0.157, 0.31, 0.29, 0, 0, 0.1);
    for (const y of [0.4, 0.28]) o.boule(0.035, "#1f2937", 0, y, -0.338, 1, 1, 0.5);
  }),
  main("balai", "Balai", (m) => {
    m.cyl(0.022, 0.022, 0.74, "#8a5a2e", 0, 0.14, 0);
    m.cyl(0.05, 0.05, 0.08, "#7c2d12", 0, 0.5, 0);
    m.cyl(0.14, 0.05, 0.26, "#d9a94a", 0, 0.66, 0).scale.z = 0.5;
    for (const x of [-0.08, -0.03, 0.02, 0.07])
      m.box(0.012, 0.2, 0.08, "#b8862f", x, 0.69, 0, 0, 0, -x);
  }),

  // ------------------------------------------------ gladiateur
  tete("casque-gladiateur", "Casque de gladiateur", (o) => {
    coiffe(o, "#a8701f", 0.43, 0.16);
    o.dome(0.265, "#c98a2b", 0, 1.0, 0.07, 0.75);
    // La grande crête en éventail, d'avant en arrière.
    for (let i = 0; i < 11; i++) {
      const a = -1.25 + (i / 10) * 2.5;
      o.box(
        0.075,
        0.2,
        0.085,
        i % 2 ? "#dc2626" : "#b91c1c",
        0,
        1.17 + Math.cos(a) * 0.14,
        0.07 + Math.sin(a) * 0.27,
        a * 0.85,
      );
    }
    for (const s of [-1, 1]) o.box(0.04, 0.24, 0.17, "#c98a2b", s * 0.262, 0.85, 0.14);
    o.box(0.46, 0.2, 0.04, "#a8701f", 0, 0.88, -0.135);
  }),
  corps("cuirasse", "Cuirasse", (o) => {
    o.habit(0.15, "#c98a2b", 1.065, 0.68, 1.05, 0.128);
    ceinture(o, "#7c2d12", 0.285, 0.11);
    for (let i = -3; i <= 3; i++) {
      o.box(0.058, 0.12, 0.018, "#8b4513", i * 0.07, 0.19, 0.285);
      o.box(0.058, 0.12, 0.018, "#8b4513", i * 0.07, 0.19, -0.345);
    }
    for (const x of [-0.09, 0.09]) o.boule(0.085, "#e0a640", x, 0.45, 0.255, 1, 0.8, 0.35);
    for (const x of [-0.29, 0.29]) o.boule(0.11, "#e0a640", x, 0.52, -0.03, 0.75, 0.55, 1.2);
  }),
  dos("scutum", "Grand bouclier dorsal", (o) => {
    o.box(0.46, 0.56, 0.05, "#b91c1c", 0, 0.44, -0.39);
    for (const y of [0.175, 0.705]) o.box(0.48, 0.035, 0.065, "#ffcf3a", 0, y, -0.39);
    for (const x of [-0.235, 0.235]) o.box(0.035, 0.56, 0.065, "#ffcf3a", x, 0.44, -0.39);
    o.boule(0.08, "#ffcf3a", 0, 0.44, -0.42, 1, 1, 0.6);
    for (const r of [0.75, -0.75]) o.box(0.5, 0.03, 0.012, "#ffcf3a", 0, 0.44, -0.419, 0, 0, r);
  }),

  // ------------------------------------------------ pilote de course
  tete("casque-integral", "Casque intégral", (o) => {
    o.habit(0.5, "peau", 1.14, 1.06, 1.09, -0.008);
    o.fenetre(0.2, 0.765, 0.955, 0.268);
    o.dome(0.255, "peau", 0, 1.03, 0.07, 0.45);
    o.box(0.1, 0.03, 0.46, "#f8fafc", 0, 1.15, 0.07);
    for (const x of [-0.085, 0.085]) o.box(0.035, 0.028, 0.46, "#1d4ed8", x, 1.135, 0.07);
    o.box(0.46, 0.045, 0.06, "#0f172a", 0, 0.975, 0.28);
    o.box(0.44, 0.07, 0.012, "#f8fafc", 0, 0.78, -0.135);
  }),
  corps("combi-course", "Combinaison de course", (o) => {
    habille(o, "peau");
    ceinture(o, "#f8fafc", 0.33, 0.13);
    // Le damier, devant et surtout derrière.
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j < 2; j++) {
        if ((i + j) % 2) continue;
        const [x, y] = [-0.18 + i * 0.06, 0.31 + j * 0.04];
        o.box(0.06, 0.04, 0.008, "#111827", x, y, 0.2835);
        o.box(0.06, 0.04, 0.008, "#111827", x, y, -0.3435);
      }
    }
  }),
  dos("aileron-course", "Aileron de course", (o) => {
    for (const x of [-0.16, 0.16]) o.box(0.04, 0.24, 0.09, "#1f2937", x, 0.58, -0.37, -0.35);
    o.box(0.64, 0.035, 0.17, "peau", 0, 0.7, -0.42, -0.12);
    for (const x of [-0.33, 0.33]) o.box(0.035, 0.13, 0.19, "#f8fafc", x, 0.7, -0.42);
  }),
  main("volant", "Volant", (m) => {
    m.tore(0.16, 0.035, "#111827", 0.05, 0.12, 0.08);
    for (const a of [0, 2.1, 4.2])
      m.box(
        0.025,
        0.15,
        0.025,
        "#cbd5e1",
        0.05 + Math.sin(a) * 0.075,
        0.12 + Math.cos(a) * 0.075,
        0.08,
        0,
        0,
        -a,
      );
    m.cyl(0.05, 0.05, 0.05, "#e11d48", 0.05, 0.12, 0.09, Math.PI / 2);
  }),

  // ------------------------------------------------ rockeur
  tete("crete", "Crête de punk", (o) => {
    coiffe(o, "#1f1f2b", 0.475, 0.05);
    for (let i = 0; i < 6; i++) {
      const loin = Math.abs(i - 2);
      const pic = o.cone(
        0.105,
        0.44 - loin * 0.045,
        "#e11dca",
        0,
        1.2 - loin * 0.02,
        0.23 - i * 0.065,
        (2 - i) * 0.17,
      );
      pic.scale.x = 0.75;
    }
  }),
  corps("blouson", "Blouson de cuir", (o) => {
    habille(o, "#17171f");
    o.forme(
      [
        [-0.09, 0.548],
        [0.09, 0.548],
        [0.015, 0.3],
        [-0.015, 0.3],
      ],
      "#f1f5f9",
      0.2735,
    );
    for (const s of [-1, 1]) {
      o.forme(
        [
          [s * 0.09, 0.548],
          [s * 0.2, 0.53],
          [s * 0.06, 0.38],
        ],
        "#2f2f3d",
        0.276,
      );
      for (const y of [0.22, 0.27]) o.boule(0.018, "#cbd5e1", s * 0.17, y, 0.282);
    }
    o.box(0.014, 0.13, 0.008, "#cbd5e1", 0, 0.23, 0.278);
    ceinture(o, "#2f2f3d", 0.19, 0.11);
    for (let i = -3; i <= 3; i++) o.boule(0.02, "#cbd5e1", i * 0.065, 0.49, -0.338);
    o.forme(
      [
        [-0.1, 0.42],
        [0.02, 0.35],
        [-0.03, 0.34],
        [0.1, 0.24],
        [0.02, 0.32],
        [0.07, 0.33],
      ],
      "#ef4444",
      -0.3395,
    );
  }),
  main("guitare", "Guitare électrique", (m) => {
    plaque(
      m,
      [
        [-0.15, -0.14],
        [0, -0.19],
        [0.17, -0.12],
        [0.12, 0.0],
        [0.2, 0.13],
        [0.06, 0.08],
        [-0.05, 0.14],
        [-0.1, 0.03],
        [-0.17, -0.02],
      ],
      "#dc2626",
      0.04,
      0.05,
      0.12,
      0.055,
    );
    m.box(0.045, 0.44, 0.03, "#7c4a21", 0.04, 0.38, 0.12);
    m.box(0.085, 0.11, 0.03, "#111827", 0.04, 0.65, 0.12);
    m.box(0.12, 0.07, 0.015, "#f8fafc", 0.04, 0.03, 0.155);
    for (const x of [0.027, 0.053]) m.box(0.006, 0.6, 0.006, "#e2e8f0", x, 0.3, 0.165);
  }),

  // ------------------------------------------------ requin
  tete("capuche-requin", "Capuche requin", (o) => {
    coiffe(o, "peau", 0.43, 0.19);
    o.dome(0.265, "peau", 0, 1.005, 0.07, 0.8);
    for (let i = -3; i <= 3; i++)
      o.cone(0.032, 0.09, "#f8fafc", i * 0.068, 0.92, 0.272, Math.PI).scale.z = 0.4;
    for (const s of [-1, 1]) {
      o.boule(0.045, "#f8fafc", s * 0.2, 1.08, 0.23);
      o.boule(0.025, "#0f172a", s * 0.212, 1.083, 0.268);
      o.box(0.045, 0.34, 0.3, "peau", s * 0.262, 0.82, -0.01);
    }
    o.box(0.5, 0.36, 0.05, "peau", 0, 0.82, -0.14);
    plaque(
      o,
      [
        [0.12, 0],
        [-0.2, 0],
        [-0.17, 0.3],
      ],
      "peau-sombre",
      0,
      1.18,
      0.07,
      0.04,
      0,
      -Math.PI / 2,
      0,
    );
  }),
  corps("costume-requin", "Costume de requin", (o) => {
    habille(o, "peau");
    o.forme(
      [
        [-0.17, 0.548],
        [0.17, 0.548],
        [0.11, 0.165],
        [-0.11, 0.165],
      ],
      "#f1f5f9",
      0.2735,
    );
    for (const s of [-1, 1])
      plaque(
        o,
        [
          [0, 0.07],
          [s * 0.2, -0.07],
          [0, -0.07],
        ],
        "peau-sombre",
        s * 0.27,
        0.37,
        0,
        0.035,
        0,
        0,
        0,
      );
    for (const y of [0.3, 0.36, 0.42])
      for (const s of [-1, 1]) o.box(0.008, 0.035, 0.09, "peau-sombre", s * 0.2735, y, -0.14, 0.5);
  }),
  dos("queue-requin", "Queue de requin", (o) => {
    o.cone(0.14, 0.34, "peau", 0, 0.32, -0.47, -Math.PI / 2 - 0.15).scale.x = 0.6;
    const nageoire = [
      [-0.05, 0],
      [-0.34, 0.34],
      [-0.12, 0.17],
      [0, 0.11],
      [0.12, 0.17],
      [0.34, 0.34],
      [0.05, 0],
    ];
    plaque(o, nageoire, "peau-sombre", 0, 0.34, -0.62, 0.05, 0.12);
  }),

  // ------------------------------------------------ champignon
  tete("chapeau-champignon", "Chapeau de champignon", (o) => {
    o.dome(0.46, "#dc2626", 0, 1.0, 0.05, 0.75);
    o.cyl(0.46, 0.4, 0.05, "#fde8c8", 0, 0.985, 0.05);
    const points = [
      [0, 1.345, 0.05, 0.085],
      [0.27, 1.23, 0.17, 0.07],
      [-0.28, 1.22, 0.14, 0.065],
      [0.1, 1.14, 0.43, 0.06],
      [-0.19, 1.2, -0.25, 0.075],
      [0.25, 1.17, -0.23, 0.06],
      [-0.4, 1.07, -0.02, 0.05],
      [0.41, 1.07, 0.04, 0.05],
    ];
    for (const [x, y, z, r] of points) o.boule(r, "#fef3e2", x, y, z, 1, 0.55, 1);
  }),
  corps("pied-champignon", "Pied de champignon", (o) => {
    habille(o, "#fde8c8");
    ceinture(o, "#fff7ea", 0.45, 0.14);
    for (let i = -3; i <= 3; i++) {
      o.cone(0.04, 0.09, "#fff7ea", i * 0.068, 0.385, 0.285, Math.PI);
      o.cone(0.04, 0.09, "#fff7ea", i * 0.068, 0.385, -0.345, Math.PI);
    }
  }),

  // ------------------------------------------------ ninja, refait
  tete("capuche-ninja", "Capuche de ninja", (o) => {
    o.habit(0.5, "peau-sombre", 1.095, 1.045, 1.052, -0.005);
    o.fenetre(0.2, 0.775, 0.945, 0.2608);
    o.habit(0.5, "peau", 1.115, 0.15, 1.072, 0.405);
    for (const [x, y, r] of [
      [-0.08, 0.86, -0.5],
      [0.06, 0.82, 0.35],
    ]) {
      plaque(
        o,
        [
          [-0.03, 0],
          [0.03, 0],
          [0.075, -0.4],
          [-0.015, -0.36],
        ],
        "peau",
        x,
        y + 0.12,
        -0.22,
        0.015,
        -0.55,
        0,
        r,
      );
    }
    o.boule(0.065, "peau", 0, 0.97, -0.165);
  }),
  corps("tenue-ninja", "Tenue de ninja", (o) => {
    habille(o, "peau-sombre");
    for (const s of [-1, 1])
      o.box(0.045, 0.34, 0.006, "peau", s * 0.07, 0.38, 0.2745, 0, 0, s * 0.45);
    ceinture(o, "peau", 0.25, 0.14);
    o.box(0.07, 0.16, 0.025, "peau", 0.08, 0.19, 0.29, 0, 0, 0.3);
  }),
  main("shuriken", "Étoile de ninja", (m) => {
    const etoile = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const r = i % 2 ? 0.06 : 0.21;
      etoile.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    plaque(m, etoile, "#cbd5e1", 0.07, 0.15, 0.08, 0.035, 0, 0, 0.25);
    m.cyl(0.035, 0.035, 0.05, "#1e293b", 0.07, 0.15, 0.08, Math.PI / 2);
  }),

  // ------------------------------------------------ pharaon, refait
  tete("nemes", "Coiffe royale rayée", (o) => {
    coiffe(o, "#ffcf3a", 0.43, 0.19);
    o.dome(0.262, "#ffcf3a", 0, 1.005, 0.06, 0.65);
    // De face, deux pans évasés qui encadrent la tête : la silhouette du pharaon.
    for (const s of [-1, 1]) {
      plaque(
        o,
        [
          [s * 0.23, 1.04],
          [s * 0.34, 0.99],
          [s * 0.47, 0.6],
          [s * 0.24, 0.6],
        ],
        "#ffcf3a",
        0,
        0,
        0.03,
        0.12,
      );
      for (const [y, l] of [
        [0.93, 0.115],
        [0.82, 0.15],
        [0.71, 0.185],
      ])
        o.box(l, 0.045, 0.135, "#1d4ed8", s * (0.24 + l / 2), y, 0.03);
    }
    plaque(
      o,
      [
        [-0.3, 0.98],
        [0.3, 0.98],
        [0.4, 0.6],
        [-0.4, 0.6],
      ],
      "#ffcf3a",
      0,
      0,
      -0.175,
      0.07,
    );
    for (const [y, l] of [
      [0.9, 0.62],
      [0.79, 0.67],
      [0.68, 0.73],
    ])
      o.box(l, 0.045, 0.085, "#1d4ed8", 0, y, -0.175);
    o.cone(0.045, 0.16, "#1d4ed8", 0, 1.13, 0.27, 0.35);
    o.boule(0.035, "#ef4444", 0, 1.21, 0.3);
  }),
  corps("collier-pharaon", "Grand collier", (o) => {
    o.habit(0.15, "#f1f5f9", 1.062, 0.5, 1.046);
    for (const [couleur, haut, ep] of [
      ["#ffcf3a", 0.53, 0.08],
      ["#1d4ed8", 0.465, 0.07],
      ["#ffcf3a", 0.405, 0.06],
      ["#0ea5a4", 0.355, 0.05],
    ])
      ceinture(o, couleur, haut, ep);
    ceinture(o, "#ffcf3a", 0.22, 0.08);
    o.forme(
      [
        [-0.07, 0.22],
        [0.07, 0.22],
        [0.11, 0.155],
        [-0.11, 0.155],
      ],
      "#1d4ed8",
      0.285,
    );
  }),
];

const univers = (id, nom, pieces) => ({ id: `lot1-${id}`, nom, pieces });

export const THEMES_LOT1 = [
  univers("samourai", "Samouraï", ["kabuto", "armure-laquee", "banniere", "katana-main"]),
  univers("robot", "Robot", ["tete-robot", "torse-robot", "batterie", "cle"]),
  univers("pompier", "Pompier", ["pompier", "veste-pompier", "bouteilles", "lance"]),
  univers("vampire", "Vampire", [
    "cheveux-vampire",
    "gilet-vampire",
    "cape-vampire",
    "chauve-souris",
  ]),
  univers("neige", "Bonhomme de neige", ["seau", "carotte", "costume-neige", "balai"]),
  univers("gladiateur", "Gladiateur", ["casque-gladiateur", "cuirasse", "scutum", "epee"]),
  univers("pilote", "Pilote de course", [
    "casque-integral",
    "combi-course",
    "aileron-course",
    "volant",
  ]),
  univers("rockeur", "Rockeur", ["crete", "soleil", "blouson", "guitare"]),
  univers("requin", "Requin", ["capuche-requin", "costume-requin", "queue-requin"]),
  univers("champignon", "Champignon", ["chapeau-champignon", "pied-champignon"]),
  univers("ninja", "Ninja (refait)", ["capuche-ninja", "tenue-ninja", "katana", "shuriken"]),
  univers("pharaon", "Pharaon (refait)", ["nemes", "collier-pharaon", "sceptre"]),
];

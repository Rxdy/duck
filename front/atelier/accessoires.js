/**
 * Atelier des accessoires du coincoin. Pas encore branché au jeu.
 *
 * Règles : le modèle du canard n'est jamais modifié, on ajoute par-dessus. Un
 * accessoire de tête qui porte `sansAntennes` masque seulement les antennes. Les
 * vêtements reprennent la forme exacte du corps ou de la tête, à peine agrandie.
 * Chacun doit se lire de face ET de dos.
 *
 * Repère : canard posé sur y = 0, bec vers +z. Corps : x ±0.25, y 0.15 à 0.57,
 * z -0.31 à 0.25. Tête : x ±0.23, y 0.5 à 1.0, z -0.11 à 0.25.
 */
import * as T from "three";
import { NOUVEAUX, THEMES } from "./themes.js";

function outils(duck, groupe) {
  const mat = (c, o = {}) => new T.MeshLambertMaterial({ color: c, ...o });
  const add = (geo, m, x, y, z, rx = 0, ry = 0, rz = 0) => {
    const mesh = new T.Mesh(geo, m);
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx, ry, rz);
    groupe.add(mesh);
    return mesh;
  };
  const box = (w, h, d, c, x, y, z, ...rot) =>
    add(new T.BoxGeometry(w, h, d), mat(c), x, y, z, ...rot);
  const cyl = (haut, bas, h, c, x, y, z, ...rot) =>
    add(new T.CylinderGeometry(haut, bas, h, 32), mat(c), x, y, z, ...rot);
  const cone = (r, h, c, x, y, z, ...rot) =>
    add(new T.ConeGeometry(r, h, 32), mat(c), x, y, z, ...rot);
  const boule = (r, c, x, y, z, sx = 1, sy = 1, sz = 1) => {
    const mesh = add(new T.SphereGeometry(r, 24, 16), mat(c), x, y, z);
    mesh.scale.set(sx, sy, sz);
    return mesh;
  };
  const dome = (r, c, x, y, z, sy = 1) => {
    const mesh = add(
      new T.SphereGeometry(r, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
      mat(c),
      x,
      y,
      z,
    );
    mesh.scale.y = sy;
    return mesh;
  };
  const tore = (r, tube, c, x, y, z, arc = Math.PI * 2, ...rot) =>
    add(new T.TorusGeometry(r, tube, 12, 48, arc), mat(c), x, y, z, ...rot);
  const forme = (points, c, z) => {
    const s = new T.Shape();
    points.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
    return add(new T.ShapeGeometry(s), mat(c, { side: T.DoubleSide }), 0, 0, z);
  };
  const piece = (y) =>
    duck.group.children.find(
      (o) =>
        o.isMesh && o.geometry.type === "ExtrudeGeometry" && Math.abs(o.position.y - y) < 0.001,
    );
  /** La forme même du corps (y=0.15) ou de la tête (y=0.5), agrandie : un vêtement ajusté. */
  const habit = (y, c, sx, sy, sz, dy = 0) => {
    const source = piece(y);
    const mesh = add(source.geometry, mat(c), source.position.x, y + dy, source.position.z);
    mesh.scale.set(sx, sy, sz);
    return mesh;
  };
  /**
   * Le canard n'a pas de bras : une moufle à SA couleur, posée sur le côté, tient
   * l'objet. `dessiner` travaille dans un repère local, poignée à l'origine.
   */
  const enMain = (dessiner) => {
    const main = new T.Group();
    main.position.set(0.39, 0.33, 0.13);
    main.rotation.z = -0.22;
    groupe.add(main);
    const source = piece(0.15);
    const moufle = new T.Mesh(source.geometry, source.material);
    moufle.scale.set(0.3, 0.38, 0.24);
    moufle.position.set(-0.025, -0.075, 0.007);
    main.add(moufle);
    dessiner(outils(duck, main));
  };
  return { mat, add, box, cyl, cone, boule, dome, tore, forme, habit, enMain };
}

const corps = (o, couleur, hauteur = 0.945) => o.habit(0.15, couleur, 1.065, hauteur, 1.05);
const bande = (o, couleur, y, epaisseur = 0.09) =>
  o.habit(0.15, couleur, 1.08, epaisseur, 1.062, y - 0.15);

const PREMIERE_SERIE = [
  // ---------------------------------------------------------------- tête
  {
    id: "chantier",
    nom: "Casque de chantier",
    emplacement: "tete",
    sansAntennes: true,
    creer(o) {
      o.dome(0.285, "#ffc21c", 0, 0.97, 0.07, 0.85);
      o.cyl(0.33, 0.33, 0.035, "#ffc21c", 0, 0.985, 0.07);
      o.box(0.3, 0.03, 0.14, "#ffc21c", 0, 0.985, 0.37);
      o.box(0.07, 0.05, 0.5, "#ffd65c", 0, 1.19, 0.07);
      o.box(0.16, 0.08, 0.04, "#f1f5f9", 0, 1.07, 0.34);
      o.box(0.2, 0.05, 0.03, "#e11d48", 0, 1.04, -0.215);
    },
  },
  {
    id: "pompier",
    nom: "Casque de pompier",
    emplacement: "tete",
    sansAntennes: true,
    creer(o) {
      o.dome(0.29, "#d91e2e", 0, 0.97, 0.07, 0.95);
      o.cyl(0.31, 0.34, 0.05, "#a8121f", 0, 0.98, 0.07);
      o.box(0.4, 0.03, 0.2, "#a8121f", 0, 0.95, -0.24, -0.35);
      o.tore(0.275, 0.028, "#ffcf3a", 0, 0.98, 0.07, Math.PI, 0, Math.PI / 2);
      o.cyl(0.075, 0.075, 0.03, "#ffcf3a", 0, 1.09, 0.34, Math.PI / 2);
    },
  },
  {
    id: "hautdeforme",
    nom: "Haut-de-forme",
    emplacement: "tete",
    sansAntennes: true,
    creer(o) {
      o.cyl(0.34, 0.34, 0.035, "#1b2130", 0, 1.005, 0.07);
      o.cyl(0.215, 0.2, 0.36, "#1b2130", 0, 1.2, 0.07);
      o.cyl(0.214, 0.205, 0.075, "#7dd3fc", 0, 1.065, 0.07);
    },
  },
  {
    id: "casquette",
    nom: "Casquette",
    emplacement: "tete",
    sansAntennes: true,
    creer(o) {
      o.dome(0.26, "#2f5fd0", 0, 0.985, 0.06, 0.65);
      o.box(0.34, 0.035, 0.24, "#24499f", 0, 1.0, 0.36);
      o.cyl(0.035, 0.035, 0.03, "#dbeafe", 0, 1.16, 0.06);
      o.box(0.18, 0.035, 0.02, "#dbeafe", 0, 1.03, -0.19);
    },
  },
  {
    id: "couronne",
    nom: "Couronne",
    emplacement: "tete",
    sansAntennes: true,
    creer(o) {
      o.cyl(0.2, 0.2, 0.1, "#ffcf3a", 0, 1.05, 0.07);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        o.cone(0.055, 0.13, "#ffcf3a", Math.sin(a) * 0.17, 1.16, 0.07 + Math.cos(a) * 0.17);
        o.boule(
          0.028,
          i % 2 ? "#2f8cff" : "#3fe06a",
          Math.sin(a) * 0.2,
          1.05,
          0.07 + Math.cos(a) * 0.2,
        );
      }
    },
  },
  {
    id: "bonnet",
    nom: "Bonnet à pompon",
    emplacement: "tete",
    sansAntennes: true,
    creer(o) {
      o.dome(0.265, "#0ea5a4", 0, 0.98, 0.06, 1.05);
      o.cyl(0.275, 0.28, 0.095, "#e2f5f4", 0, 1.0, 0.06);
      o.tore(0.205, 0.016, "#e2f5f4", 0, 1.15, 0.06, Math.PI * 2, Math.PI / 2);
      o.boule(0.085, "#e2f5f4", 0, 1.3, 0.06);
    },
  },
  {
    id: "cowboy",
    nom: "Chapeau de cowboy",
    emplacement: "tete",
    sansAntennes: true,
    creer(o) {
      const bord = o.cyl(0.38, 0.38, 0.03, "#9a6434", 0, 1.01, 0.07);
      bord.scale.set(1.18, 1, 0.95);
      // Bords relevés sur les côtés.
      for (const x of [-0.4, 0.4])
        o.tore(0.2, 0.022, "#8a5a2e", x, 1.045, 0.07, Math.PI, 0, Math.PI / 2).scale.y = 0.35;
      o.cyl(0.17, 0.215, 0.24, "#a9713f", 0, 1.14, 0.07);
      o.cyl(0.208, 0.218, 0.055, "#4a2c17", 0, 1.05, 0.07);
      o.box(0.05, 0.03, 0.26, "#8a5a2e", 0, 1.265, 0.07);
    },
  },
  {
    id: "sorcier",
    nom: "Chapeau de sorcier",
    emplacement: "tete",
    sansAntennes: true,
    creer(o) {
      o.cyl(0.37, 0.37, 0.03, "#4c1d95", 0, 1.005, 0.07);
      o.cone(0.23, 0.42, "#5b21b6", 0, 1.22, 0.07);
      o.cone(0.07, 0.17, "#5b21b6", 0.05, 1.45, 0.05, 0, 0, -0.55);
      o.cyl(0.208, 0.226, 0.05, "#ffcf3a", 0, 1.045, 0.07);
      for (const [x, y, z] of [
        [0.05, 1.18, 0.24],
        [-0.13, 1.12, 0.18],
        [0.11, 1.28, -0.06],
        [-0.04, 1.2, -0.1],
      ]) {
        o.add(new T.OctahedronGeometry(0.034), o.mat("#ffe23a"), x, y, z);
      }
    },
  },
  {
    id: "toque",
    nom: "Toque de chef",
    emplacement: "tete",
    sansAntennes: true,
    creer(o) {
      o.cyl(0.2, 0.19, 0.2, "#f8fafc", 0, 1.08, 0.07);
      o.boule(0.15, "#f8fafc", 0, 1.24, 0.07, 1.25, 0.8, 1.2);
      for (const [x, z] of [
        [-0.13, 0],
        [0.13, 0],
        [0, 0.13],
        [0, -0.13],
      ])
        o.boule(0.11, "#f1f5f9", x, 1.22, 0.07 + z);
      o.cyl(0.195, 0.195, 0.035, "#cbd5e1", 0, 1.01, 0.07);
    },
  },
  {
    id: "noel",
    nom: "Bonnet de Noël",
    emplacement: "tete",
    sansAntennes: true,
    creer(o) {
      o.cone(0.25, 0.32, "#dc2626", -0.02, 1.16, 0.06, 0, 0, 0.12);
      o.cone(0.1, 0.26, "#dc2626", -0.15, 1.3, 0.06, 0, 0, 1.35);
      o.boule(0.07, "#f8fafc", -0.29, 1.29, 0.06);
      o.cyl(0.27, 0.275, 0.09, "#f8fafc", 0, 1.01, 0.06);
    },
  },
  {
    id: "pirate",
    nom: "Bandana de pirate",
    emplacement: "tete",
    sansAntennes: true,
    creer(o) {
      o.habit(0.5, "#b91c1c", 1.075, 0.2, 1.065, 0.42);
      o.boule(0.065, "#b91c1c", 0, 0.95, -0.17);
      for (const s of [-1, 1])
        o.box(0.07, 0.2, 0.025, "#991b1b", s * 0.07, 0.84, -0.18, -0.25, 0, s * 0.35);
      for (const [x, y] of [
        [-0.12, 0.965],
        [0.02, 0.975],
        [0.14, 0.96],
      ])
        o.boule(0.018, "#fef2f2", x, y, 0.267, 1, 1, 0.4);
    },
  },
  {
    id: "aureole",
    nom: "Auréole",
    emplacement: "tete",
    sansAntennes: true,
    creer(o) {
      o.tore(
        0.2,
        0.03,
        "#ffe88a",
        0,
        1.19,
        0.07,
        Math.PI * 2,
        Math.PI / 2 - 0.12,
      ).material.emissive.set("#a07a10");
    },
  },
  {
    id: "cagoule",
    nom: "Cagoule",
    emplacement: "tete",
    sansAntennes: true,
    creer(o) {
      o.habit(0.5, "#2f3542", 1.065, 1.025, 1.047);
      const w = new T.Shape();
      const [x, y0, y1, r] = [0.19, 0.775, 0.945, 0.05];
      w.moveTo(-x + r, y0);
      w.lineTo(x - r, y0);
      w.quadraticCurveTo(x, y0, x, y0 + r);
      w.lineTo(x, y1 - r);
      w.quadraticCurveTo(x, y1, x - r, y1);
      w.lineTo(-x + r, y1);
      w.quadraticCurveTo(-x, y1, -x, y1 - r);
      w.lineTo(-x, y0 + r);
      w.quadraticCurveTo(-x, y0, -x + r, y0);
      // Fenêtre des yeux, à la couleur du canard : les yeux du modèle restent devant.
      o.add(new T.ShapeGeometry(w), o.mat("#ff5578"), 0, 0, 0.2592);
      o.habit(0.5, "#7dd3fc", 1.08, 0.045, 1.065, 0.425);
      o.habit(0.5, "#434b5c", 1.09, 0.13, 1.075, -0.005);
      o.box(0.025, 0.34, 0.012, "#7dd3fc", 0, 0.76, -0.124);
    },
  },
  // ---------------------------------------------------------------- visage
  {
    id: "lunettes",
    nom: "Lunettes",
    emplacement: "visage",
    creer: (o) => monture(o, "#111827"),
  },
  {
    id: "soleil",
    nom: "Lunettes de soleil",
    emplacement: "visage",
    creer(o) {
      monture(o, "#0b0f19");
      for (const x of [-0.105, 0.105]) o.box(0.15, 0.15, 0.012, "#16233f", x, 0.84, 0.292);
      for (const x of [-0.135, 0.075])
        o.box(0.025, 0.09, 0.004, "#7dd3fc", x, 0.855, 0.3, 0, 0, -0.6);
    },
  },
  {
    id: "cacheoeil",
    nom: "Cache-œil",
    emplacement: "visage",
    creer(o) {
      o.cyl(0.095, 0.095, 0.025, "#111827", -0.1, 0.845, 0.29, Math.PI / 2);
      o.habit(0.5, "#111827", 1.07, 0.05, 1.058, 0.38);
      o.box(0.5, 0.036, 0.005, "#111827", 0, 0.895, 0.2645, 0, 0, -0.16);
    },
  },
  {
    id: "audio",
    nom: "Casque audio",
    emplacement: "visage",
    creer(o) {
      o.tore(0.29, 0.032, "#1f2937", 0, 0.84, 0.03, Math.PI).scale.y = 0.95;
      for (const x of [-0.28, 0.28]) {
        o.cyl(0.12, 0.12, 0.09, "#1f2937", x, 0.82, 0.03, 0, 0, Math.PI / 2);
        o.cyl(0.085, 0.085, 0.1, "#7dd3fc", x * 1.03, 0.82, 0.03, 0, 0, Math.PI / 2);
      }
    },
  },
  // ---------------------------------------------------------------- corps
  {
    id: "veste",
    nom: "Veste",
    emplacement: "corps",
    creer(o) {
      const [c, c2] = ["#33518f", "#22386a"];
      corps(o, c);
      o.forme(
        [
          [-0.1, 0.545],
          [0.1, 0.545],
          [0, 0.31],
        ],
        "#f1f5f9",
        0.2735,
      );
      o.forme(
        [
          [-0.115, 0.545],
          [-0.045, 0.545],
          [-0.005, 0.33],
          [-0.085, 0.43],
        ],
        c2,
        0.276,
      );
      o.forme(
        [
          [0.115, 0.545],
          [0.045, 0.545],
          [0.005, 0.33],
          [0.085, 0.43],
        ],
        c2,
        0.276,
      );
      o.box(0.012, 0.15, 0.006, c2, 0, 0.24, 0.274);
      for (const y of [0.28, 0.215])
        o.cyl(0.022, 0.022, 0.016, "#e2e8f0", 0.045, y, 0.278, Math.PI / 2);
      bande(o, c2, 0.19, 0.13);
      bande(o, c2, 0.515, 0.08);
      o.box(0.014, 0.28, 0.01, "#7f9bd6", 0, 0.36, -0.3365);
      o.box(0.34, 0.016, 0.01, "#7f9bd6", 0, 0.43, -0.3365);
      for (const x of [-0.272, 0.272]) {
        o.box(0.035, 0.26, 0.17, c2, x, 0.37, -0.03, 0.18);
        o.box(0.04, 0.05, 0.12, "#f1f5f9", x, 0.245, -0.005, 0.18);
      }
    },
  },
  {
    id: "gilet",
    nom: "Gilet de chantier",
    emplacement: "corps",
    creer(o) {
      o.habit(0.15, "#ff7a1a", 1.065, 0.93, 1.05, 0.012);
      for (const y of [0.255, 0.385]) bande(o, "#e8edf3", y);
      o.forme(
        [
          [-0.085, 0.548],
          [0.085, 0.548],
          [0.035, 0.19],
          [-0.035, 0.19],
        ],
        "#ff5578",
        0.2715,
      );
      o.forme(
        [
          [-0.083, 0.45],
          [0.083, 0.45],
          [0.04, 0.2],
          [-0.04, 0.2],
        ],
        "#ff5578",
        0.276,
      );
      for (const s of [-1, 1])
        o.box(0.02, 0.3, 0.008, "#c2540c", s * 0.075, 0.35, 0.278, 0, 0, s * 0.17);
    },
  },
  {
    id: "tablier",
    nom: "Tablier",
    emplacement: "corps",
    creer(o) {
      o.forme(
        [
          [-0.13, 0.54],
          [0.13, 0.54],
          [0.2, 0.17],
          [-0.2, 0.17],
        ],
        "#f1f5f9",
        0.277,
      );
      o.box(0.17, 0.1, 0.012, "#cbd5e1", 0, 0.29, 0.285);
      bande(o, "#e11d48", 0.34, 0.1);
      o.forme(
        [
          [-0.2, 0.385],
          [0.2, 0.385],
          [0.2, 0.17],
          [-0.2, 0.17],
        ],
        "#f1f5f9",
        0.2785,
      );
      for (const s of [-1, 1])
        o.box(0.12, 0.045, 0.02, "#e11d48", s * 0.06, 0.33, -0.345, 0, 0, s * 0.5);
      o.boule(0.035, "#be123c", 0, 0.345, -0.345);
    },
  },
  {
    id: "echarpe",
    nom: "Écharpe",
    emplacement: "corps",
    creer(o) {
      bande(o, "#e11d48", 0.5, 0.2);
      bande(o, "#fecdd3", 0.525, 0.045);
      o.box(0.14, 0.28, 0.04, "#e11d48", 0.14, 0.38, 0.29, 0, 0, 0.08);
      for (const y of [0.31, 0.27])
        o.box(0.142, 0.025, 0.045, "#fecdd3", 0.14 + (0.38 - y) * 0.08, y, 0.29, 0, 0, 0.08);
      o.box(0.16, 0.24, 0.04, "#be123c", -0.12, 0.39, -0.35, -0.08, 0, -0.12);
    },
  },
  {
    id: "noeud",
    nom: "Nœud papillon",
    emplacement: "corps",
    creer(o) {
      for (const s of [-1, 1])
        o.cone(0.085, 0.17, "#e11d48", s * 0.095, 0.47, 0.285, 0, 0, s * (Math.PI / 2)).scale.z =
          0.4;
      o.boule(0.042, "#9f1239", 0, 0.47, 0.29);
      bande(o, "#9f1239", 0.485, 0.05);
    },
  },
  {
    id: "cravate",
    nom: "Cravate",
    emplacement: "corps",
    creer(o) {
      o.forme(
        [
          [-0.13, 0.55],
          [0, 0.5],
          [-0.03, 0.55],
        ],
        "#f8fafc",
        0.274,
      );
      o.forme(
        [
          [0.13, 0.55],
          [0, 0.5],
          [0.03, 0.55],
        ],
        "#f8fafc",
        0.274,
      );
      o.forme(
        [
          [-0.035, 0.52],
          [0.035, 0.52],
          [0.065, 0.27],
          [0, 0.18],
          [-0.065, 0.27],
        ],
        "#1d4ed8",
        0.277,
      );
      o.box(0.08, 0.05, 0.02, "#1e3a8a", 0, 0.51, 0.282);
    },
  },
  // ---------------------------------------------------------------- dos
  {
    id: "cape",
    nom: "Cape",
    emplacement: "dos",
    creer(o) {
      // Un drapé : des plis qui s'élargissent vers le bas.
      const geo = new T.PlaneGeometry(1, 1, 36, 14);
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const u = p.getX(i);
        const t = 0.5 - p.getY(i);
        p.setXYZ(
          i,
          u * (0.5 + t * 0.34),
          0.575 - t * 0.44,
          -0.33 - t * 0.17 - Math.sin(u * Math.PI * 7) * 0.032 * t,
        );
      }
      geo.computeVertexNormals();
      o.add(geo, o.mat("#7c3aed", { side: T.DoubleSide }), 0, 0, 0);
      bande(o, "#5b21b6", 0.52, 0.1);
      for (const x of [-0.19, 0.19])
        o.cyl(0.035, 0.035, 0.03, "#ffcf3a", x, 0.54, 0.27, Math.PI / 2);
    },
  },
  {
    id: "sac",
    nom: "Sac à dos",
    emplacement: "dos",
    creer(o) {
      o.habit(0.15, "#15803d", 0.82, 0.82, 0.36, 0.04).position.z = -0.4;
      o.box(0.28, 0.13, 0.05, "#166534", 0, 0.3, -0.51);
      o.box(0.3, 0.02, 0.015, "#fde047", 0, 0.38, -0.508);
      o.tore(0.07, 0.018, "#14532d", 0, 0.535, -0.42, Math.PI);
      for (const x of [-0.17, 0.17]) {
        o.box(0.05, 0.31, 0.012, "#14532d", x, 0.39, 0.278);
        o.box(0.05, 0.018, 0.56, "#14532d", x, 0.567, -0.03);
      }
    },
  },
  {
    id: "ailes",
    nom: "Ailes",
    emplacement: "dos",
    creer(o) {
      for (const s of [-1, 1]) {
        [
          [0.34, 0.6, 0.55, 0.3],
          [0.38, 0.5, 0.2, 0.27],
          [0.36, 0.4, -0.12, 0.22],
        ].forEach(([x, y, angle, long], i) => {
          const plume = o.boule(0.5, i % 2 ? "#e2e8f0" : "#f8fafc", s * x, y, -0.36 - i * 0.012);
          plume.scale.set(long * 1.5, 0.12, 0.07);
          plume.rotation.z = s * angle;
        });
      }
    },
  },
  {
    id: "jetpack",
    nom: "Réacteur dorsal",
    emplacement: "dos",
    creer(o) {
      for (const x of [-0.12, 0.12]) {
        o.cyl(0.1, 0.1, 0.34, "#94a3b8", x, 0.4, -0.41);
        o.dome(0.1, "#e11d48", x, 0.57, -0.41);
        o.cyl(0.07, 0.09, 0.07, "#334155", x, 0.2, -0.41);
        o.cone(0.06, 0.17, "#ffb020", x, 0.085, -0.41, Math.PI).material.emissive.set("#9a4a00");
      }
      o.box(0.2, 0.2, 0.06, "#475569", 0, 0.4, -0.345);
    },
  },
];

/** Tout le catalogue : un accessoire au plus par emplacement dans une tenue. */
export const ACCESSOIRES = [...PREMIERE_SERIE, ...NOUVEAUX];
export { THEMES };

function monture(o, couleur) {
  for (const x of [-0.105, 0.105]) {
    o.box(0.175, 0.032, 0.03, couleur, x, 0.918, 0.292);
    o.box(0.175, 0.032, 0.03, couleur, x, 0.762, 0.292);
    for (const dx of [-0.075, 0.075]) o.box(0.03, 0.17, 0.03, couleur, x + dx, 0.84, 0.292);
  }
  o.box(0.05, 0.032, 0.03, couleur, 0, 0.875, 0.292);
  for (const x of [-0.248, 0.248]) {
    o.box(0.03, 0.036, 0.4, couleur, x, 0.875, 0.09);
    o.box(0.08, 0.032, 0.03, couleur, x * 0.88, 0.875, 0.292);
  }
  // Un cordon derrière la tête : sans lui, rien ne se voit de dos.
  o.habit(0.5, couleur, 1.045, 0.05, 1.035, 0.35);
}

/** Ensembles montrant que les emplacements se combinent. */
export const TENUES = [
  { id: "tenue-chantier", nom: "Tenue de chantier", pieces: ["chantier", "gilet"] },
  { id: "tenue-pirate", nom: "Pirate", pieces: ["pirate", "cacheoeil", "echarpe"] },
  { id: "tenue-gala", nom: "Soirée", pieces: ["hautdeforme", "lunettes", "veste"] },
  { id: "tenue-heros", nom: "Super-héros", pieces: ["couronne", "soleil", "cape"] },
  { id: "tenue-rando", nom: "Randonnée", pieces: ["cowboy", "echarpe", "sac"] },
];

/** Pose des accessoires sur un coincoin et masque les antennes si un couvre-chef l'exige. */
export function habiller(duck, ids) {
  const groupe = new T.Group();
  const o = outils(duck, groupe);
  const choisis = ids.map((id) => ACCESSOIRES.find((a) => a.id === id));
  if (choisis.some((a) => a.sansAntennes)) {
    for (const enfant of duck.group.children) {
      if (enfant.position.y > 1.05) enfant.visible = false;
    }
  }
  for (const accessoire of choisis) accessoire.creer(o);
  duck.group.add(groupe);
}

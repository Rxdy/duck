/**
 * Le canard joué : un « coincoin fluo », construit en blocs avec Three.js (aucun
 * fichier 3D à charger). Ce module ne connaît ni Vue ni le serveur : il fabrique
 * l'objet et porte les calculs de mouvement, voir organisms/CoincoinDuck.vue.
 * Le prototype d'origine est dans art/coincoin/prototype.html.
 *
 * Repère : le canard est posé sur y = 0 et son bec regarde vers +z.
 */
import {
  AdditiveBlending,
  BoxGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  Shape,
  Sprite,
  SpriteMaterial,
  type BufferGeometry,
  type Material,
  type Texture,
} from "three";

/** Les antennes passent par ces couleurs, toujours dans cet ordre, sans jamais s'éteindre. */
export const ANTENNA_COLORS = ["#ff5fe0", "#ffe23a", "#3fe06a", "#2f8cff"] as const;
export const ANTENNA_BEAT_MS = 500;
/** Plus lent quand le joueur demande moins d'animations. */
export const ANTENNA_BEAT_REDUCED_MS = 1500;

export function antennaColor(timeMs: number, reducedMotion = false): string {
  const beat = reducedMotion ? ANTENNA_BEAT_REDUCED_MS : ANTENNA_BEAT_MS;
  const index = Math.floor(Math.max(0, timeMs) / beat) % ANTENNA_COLORS.length;
  return ANTENNA_COLORS[index]!;
}

/**
 * Durée d'un pas : la glissade d'une case, toujours entière. C'est aussi le rythme maximal, que le
 * serveur impose (STEP_MS dans back/src/shared.ts, à garder égal).
 */
export const GLIDE_MS = 180;

export const linear = (t: number) => Math.min(1, Math.max(0, t));

/** Part de vitesse constante dans la courbe de départ : 1 serait sans aucun adoucissement. */
const STEADY = 0.8;

/**
 * Départ et arrivée d'un pas isolé, à peine adoucis. Une courbe plus marquée freinait presque à
 * l'arrêt en fin de case, puis le pas suivant repartait d'un coup : un à-coup à chaque enchaînement.
 */
export function easeInOut(t: number): number {
  const x = linear(t);
  return STEADY * x + (1 - STEADY) * ((1 - Math.cos(Math.PI * x)) / 2);
}

/** Orientation (rotation autour de y) pour un pas (dx, dy) sur la grille. */
export function headingFor(dx: number, dy: number): number | undefined {
  return dx === 0 && dy === 0 ? undefined : Math.atan2(dx, dy);
}

/** Angle intermédiaire par le plus court chemin (évite un tour complet). */
export function turnTowards(from: number, to: number, t: number): number {
  const delta = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  return from + delta * Math.min(1, Math.max(0, t));
}

/**
 * Seul un pas vers une case voisine glisse. Un retour à la base (point marqué,
 * joueur touché) est replacé d'un coup : le faire glisser montrerait un trajet
 * à travers les murs qui n'a pas eu lieu.
 */
export function shouldGlide(dx: number, dy: number): boolean {
  return Math.abs(dx) + Math.abs(dy) === 1;
}

/** Bloc aux arêtes arrondies de dimensions exactes, posé sur y = 0. */
function block(width: number, height: number, depth: number, radius: number): BufferGeometry {
  const hw = width / 2 - radius;
  const hd = depth / 2 - radius;
  // Le biseau ajoute `radius` tout autour : la forme de départ est réduite d'autant.
  const shape = new Shape();
  shape.moveTo(-hw, -hd);
  shape.lineTo(hw, -hd);
  shape.lineTo(hw, hd);
  shape.lineTo(-hw, hd);
  shape.lineTo(-hw, -hd);
  const geometry = new ExtrudeGeometry(shape, {
    depth: Math.max(height - 2 * radius, 0.001),
    bevelEnabled: true,
    bevelSize: radius,
    bevelThickness: radius,
    bevelSegments: 3,
  });
  geometry.rotateX(Math.PI / 2);
  geometry.translate(0, height - radius, 0);
  geometry.computeVertexNormals();
  return geometry;
}

/** Dégradé rond des lueurs. `undefined` sans canvas 2D (tests) : pas de lueur. */
function glowTexture(): CanvasTexture | undefined {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const context = canvas.getContext("2d");
  if (!context) return undefined;
  const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, "rgba(255,255,255,0.9)");
  gradient.addColorStop(0.35, "rgba(255,255,255,0.3)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);
  return new CanvasTexture(canvas);
}

export interface Coincoin {
  group: Group;
  setColor(color: string): void;
  setAntennaColor(color: string): void;
  /** 1 = opaque. Sert au clignotement du canard intouchable. */
  setOpacity(opacity: number): void;
  dispose(): void;
}

export function createCoincoin(color: string): Coincoin {
  const group = new Group();
  const geometries: BufferGeometry[] = [];
  const materials: Material[] = [];
  const textures: Texture[] = [];

  function surface(hex: string): MeshLambertMaterial {
    const material = new MeshLambertMaterial({ color: hex });
    materials.push(material);
    return material;
  }
  function flat(hex: string): MeshBasicMaterial {
    const material = new MeshBasicMaterial({ color: hex });
    materials.push(material);
    return material;
  }
  function add(geometry: BufferGeometry, material: Material, x: number, y: number, z: number) {
    geometries.push(geometry);
    const mesh = new Mesh(geometry, material);
    mesh.position.set(x, y, z);
    group.add(mesh);
    return mesh;
  }

  const body = surface(color);
  const antenna = surface(ANTENNA_COLORS[0]);

  // Socle
  add(block(0.66, 0.1, 0.66, 0.05), surface("#4f565e"), 0, 0, 0);
  add(block(0.6, 0.05, 0.6, 0.03), surface("#3a4047"), 0, 0.1, 0);
  // Corps : le bas dépasse derrière, la tête est posée sur l'avant
  add(block(0.5, 0.42, 0.56, 0.09), body, 0, 0.15, -0.03);
  add(block(0.46, 0.5, 0.36, 0.1), body, 0, 0.5, 0.07);
  // Bec plat en deux tons
  add(block(0.56, 0.12, 0.32, 0.06), surface("#fbc175"), 0, 0.65, 0.32);
  add(block(0.46, 0.07, 0.24, 0.035), surface("#e19a4a"), 0, 0.59, 0.3);

  const ink = flat("#14213d");
  const white = flat("#ffffff");
  const pupil = flat("#2b3a6e");
  const glowMap = glowTexture();
  if (glowMap) textures.push(glowMap);
  const antennaGlows: SpriteMaterial[] = [];

  for (const side of [1, -1]) {
    // Yeux et cils
    add(new BoxGeometry(0.13, 0.12, 0.02), ink, side * 0.1, 0.84, 0.255);
    add(new BoxGeometry(0.105, 0.095, 0.025), white, side * 0.1, 0.84, 0.258);
    add(new BoxGeometry(0.045, 0.07, 0.03), pupil, side * 0.085, 0.83, 0.262);
    for (const lash of [-1, 0, 1]) {
      const mesh = add(
        new BoxGeometry(0.015, 0.04, 0.015),
        ink,
        side * (0.1 + lash * 0.035),
        0.915,
        0.257,
      );
      mesh.rotation.z = -side * lash * 0.4;
    }
    // Antennes
    add(new CylinderGeometry(0.032, 0.032, 0.18, 12), body, side * 0.1, 1.07, 0.07);
    add(block(0.11, 0.1, 0.11, 0.045), antenna, side * 0.1, 1.14, 0.07);
    if (glowMap) {
      const material = new SpriteMaterial({
        map: glowMap,
        blending: AdditiveBlending,
        depthWrite: false,
        transparent: true,
        opacity: 0.8,
      });
      materials.push(material);
      antennaGlows.push(material);
      const sprite = new Sprite(material);
      sprite.scale.set(0.32, 0.32, 1);
      sprite.position.set(side * 0.1, 1.19, 0.07);
      group.add(sprite);
    }
  }

  // Aura autour du corps : c'est elle qui fait briller le canard. Rien au sol,
  // sous le socle.
  let aura: SpriteMaterial | undefined;
  if (glowMap) {
    aura = new SpriteMaterial({
      map: glowMap,
      color,
      blending: AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 0.5,
    });
    materials.push(aura);
    const sprite = new Sprite(aura);
    sprite.scale.set(1.9, 1.9, 1);
    sprite.position.set(0, 0.62, 0);
    group.add(sprite);
  }

  // Couleur propre : le fluo ne doit pas dépendre de l'éclairage du plateau.
  function glowing(material: MeshLambertMaterial, hex: string, k: number) {
    material.color.set(hex);
    material.emissive.copy(new Color(hex)).multiplyScalar(k);
  }

  const solid = materials.filter((m) => !m.transparent);
  const coincoin: Coincoin = {
    group,
    setColor(next) {
      glowing(body, next, 0.42);
      aura?.color.set(next);
    },
    setAntennaColor(next) {
      glowing(antenna, next, 0.8);
      for (const glow of antennaGlows) glow.color.set(next);
    },
    setOpacity(opacity) {
      for (const material of solid) {
        const transparent = opacity < 1;
        if (material.transparent !== transparent) {
          material.transparent = transparent;
          material.needsUpdate = true;
        }
        material.opacity = opacity;
      }
    },
    dispose() {
      for (const item of [...geometries, ...materials, ...textures]) item.dispose();
    },
  };
  coincoin.setColor(color);
  coincoin.setAntennaColor(ANTENNA_COLORS[0]);
  return coincoin;
}

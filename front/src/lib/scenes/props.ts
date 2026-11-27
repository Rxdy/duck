/**
 * Les décors des scènes : de gros volumes simples, dans l'esprit du canard (blocs aux arêtes nettes,
 * peu de détails). Chaque fonction rend l'objet, et une animation à jouer à chaque image s'il y en a une.
 */
import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  ConeGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  OctahedronGeometry,
  Points,
  PointsMaterial,
  SphereGeometry,
  type Material,
  type Object3D,
} from "three";

export interface Prop {
  object: Object3D;
  /** Appelé à chaque image avec le temps en secondes. */
  update?(time: number): void;
  dispose(): void;
}

/** Libère les formes et matériaux créés pour un décor. */
function disposer(root: Object3D) {
  return () =>
    root.traverse((object) => {
      if (!(object instanceof Mesh || object instanceof Points)) return;
      object.geometry.dispose();
      (object.material as Material).dispose();
    });
}

const lambert = (color: string, emissive?: string) =>
  new MeshLambertMaterial({ color, ...(emissive ? { emissive } : {}) });

function add(parent: Object3D, geometry: BufferGeometry, material: Material, x = 0, y = 0, z = 0) {
  const mesh = new Mesh(geometry, material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

/** La dalle sur laquelle se joue une scène, comme le plateau : un bloc plat, à peine plus clair que le fond. */
export function slab(size: number): Prop {
  const object = new Group();
  add(object, new BoxGeometry(size, 0.18, size), lambert("#2a303a"), 0, -0.09, 0);
  add(object, new BoxGeometry(size - 0.16, 0.04, size - 0.16), lambert("#1d222b"), 0, 0.005, 0);
  return { object, dispose: disposer(object) };
}

export function tree(height = 3.4): Prop {
  const object = new Group();
  const trunk = lambert("#6b4423");
  add(object, new CylinderGeometry(0.16, 0.2, 0.5, 8), trunk, 0, 0.25, 0);
  const greens = ["#1f7a43", "#2a8f50", "#37a35d", "#46b66a"];
  greens.forEach((green, i) => {
    const radius = 1.15 - i * 0.24;
    add(object, new ConeGeometry(radius, 1.15, 8), lambert(green), 0, 0.85 + i * 0.7, 0);
  });
  const top = 0.85 + (greens.length - 1) * 0.7 + 0.62;
  const star = add(
    object,
    new OctahedronGeometry(0.2),
    lambert("#ffe23a", "#b38f00"),
    0,
    top + 0.15,
    0,
  );

  // Boules posées sur le sapin.
  const baubles = ["#ef4444", "#3b82f6", "#fde047", "#ec4899", "#f8fafc"];
  const ball = new SphereGeometry(0.095, 10, 8);
  const lit: Mesh[] = [];
  for (let i = 0; i < 16; i++) {
    const level = i % greens.length;
    const radius = (1.15 - level * 0.24) * 0.62;
    const angle = i * 2.4;
    const y = 0.85 + level * 0.7 - 0.12;
    const mesh = add(
      object,
      ball,
      i % 3 === 0
        ? lambert(baubles[i % baubles.length]!, "#222")
        : new MeshBasicMaterial({ color: baubles[i % baubles.length]! }),
      Math.cos(angle) * radius,
      y,
      Math.sin(angle) * radius,
    );
    if (i % 3 === 0) lit.push(mesh);
  }
  object.scale.setScalar(height / 3.4);
  return {
    object,
    update(time) {
      star.rotation.y = time * 1.5;
      lit.forEach((mesh, i) => {
        // Les guirlandes clignotent chacune à son tour.
        const on = Math.sin(time * 3 + i * 1.7) > -0.2;
        (mesh.material as MeshLambertMaterial).emissive.set(on ? "#ffffff" : "#000000");
        (mesh.material as MeshLambertMaterial).emissiveIntensity = on ? 0.6 : 0;
      });
    },
    dispose: disposer(object),
  };
}

export function gift(color: string, ribbon: string, size = 0.5, height = size): Prop {
  const object = new Group();
  add(object, new BoxGeometry(size, height, size), lambert(color), 0, height / 2, 0);
  const band = lambert(ribbon);
  add(object, new BoxGeometry(size * 1.04, height * 1.04, size * 0.16), band, 0, height / 2, 0);
  add(object, new BoxGeometry(size * 0.16, height * 1.04, size * 1.04), band, 0, height / 2, 0);
  // Le nœud.
  add(
    object,
    new BoxGeometry(size * 0.28, size * 0.14, size * 0.18),
    band,
    size * 0.12,
    height + size * 0.07,
    0,
  ).rotation.y = 0.5;
  add(
    object,
    new BoxGeometry(size * 0.28, size * 0.14, size * 0.18),
    band,
    -size * 0.12,
    height + size * 0.07,
    0,
  ).rotation.y = -0.5;
  return { object, dispose: disposer(object) };
}

export function snowman(): Prop {
  const object = new Group();
  const snow = lambert("#f1f5f9");
  add(object, new SphereGeometry(0.5, 16, 12), snow, 0, 0.5, 0);
  add(object, new SphereGeometry(0.37, 16, 12), snow, 0, 1.23, 0);
  const head = add(object, new SphereGeometry(0.27, 16, 12), snow, 0, 1.8, 0);
  const coal = lambert("#111827");
  for (const side of [-1, 1])
    add(head, new BoxGeometry(0.06, 0.06, 0.04), coal, side * 0.1, 0.07, 0.25);
  const carrot = add(head, new ConeGeometry(0.05, 0.3, 8), lambert("#fb923c"), 0, -0.02, 0.37);
  carrot.rotation.x = Math.PI / 2;
  for (let i = 0; i < 3; i++)
    add(object, new BoxGeometry(0.07, 0.07, 0.04), coal, 0, 1.3 - i * 0.2, 0.36);
  // Chapeau et écharpe.
  add(object, new CylinderGeometry(0.2, 0.2, 0.26, 12), lambert("#111827"), 0, 2.15, 0);
  add(object, new CylinderGeometry(0.32, 0.32, 0.04, 12), lambert("#111827"), 0, 2.03, 0);
  add(object, new CylinderGeometry(0.3, 0.3, 0.1, 12), lambert("#dc2626"), 0, 1.58, 0);
  add(object, new BoxGeometry(0.1, 0.34, 0.06), lambert("#dc2626"), 0.18, 1.42, 0.24);
  return { object, dispose: disposer(object) };
}

/** Le sac du Père Noël, débordant de cadeaux. */
export function sack(): Prop {
  const object = new Group();
  const body = add(object, new SphereGeometry(0.5, 14, 10), lambert("#b4532a"), 0, 0.42, 0);
  body.scale.set(1, 0.95, 0.9);
  add(object, new CylinderGeometry(0.2, 0.26, 0.2, 10), lambert("#92400e"), 0, 0.9, 0);
  add(object, new BoxGeometry(0.2, 0.2, 0.2), lambert("#dc2626"), 0.12, 1.08, 0.04).rotation.set(
    0.3,
    0.5,
    0.2,
  );
  add(
    object,
    new BoxGeometry(0.17, 0.17, 0.17),
    lambert("#3b82f6"),
    -0.12,
    1.04,
    -0.04,
  ).rotation.set(0.1, -0.4, 0.3);
  return { object, dispose: disposer(object) };
}

/** Des flocons qui tombent sur toute la scène, sans jamais s'arrêter. */
export function snowfall(count: number, area: { x: number; z: number; height: number }): Prop {
  const positions = new Float32Array(count * 3);
  const seeds = Array.from({ length: count }, (_, i) => ({
    x: (Math.sin(i * 12.9898) * 43758.5453) % 1,
    z: (Math.sin(i * 78.233) * 12543.123) % 1,
    phase: (Math.sin(i * 39.346) * 9871.5) % 1,
    speed: 0.5 + Math.abs((Math.sin(i * 5.17) * 311.7) % 1) * 0.7,
  }));
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  const object = new Points(
    geometry,
    new PointsMaterial({
      color: "#ffffff",
      size: 3,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.8,
    }),
  );
  object.frustumCulled = false;
  const update = (time: number) => {
    seeds.forEach((seed, i) => {
      const fall = (((time * seed.speed * 0.6 + seed.phase) % 1) + 1) % 1;
      positions[i * 3] = seed.x * area.x + Math.sin(time * 0.8 + i) * 0.15;
      positions[i * 3 + 1] = area.height * (1 - fall);
      positions[i * 3 + 2] = seed.z * area.z;
    });
    geometry.attributes.position!.needsUpdate = true;
  };
  update(0);
  return { object, update, dispose: disposer(object) };
}

/** Une canne en sucre, rayée de rouge et de blanc. */
export function cane(height = 0.8): Prop {
  const object = new Group();
  const red = lambert("#dc2626");
  const white = lambert("#f8fafc");
  const stripes = 5;
  const stripe = height / stripes;
  for (let i = 0; i < stripes; i++) {
    add(
      object,
      new CylinderGeometry(0.045, 0.045, stripe, 8),
      i % 2 ? white : red,
      0,
      stripe * (i + 0.5),
      0,
    );
  }
  const hook = add(
    object,
    new CylinderGeometry(0.045, 0.045, 0.22, 8),
    red,
    0.09,
    height + 0.02,
    0,
  );
  hook.rotation.z = Math.PI / 2;
  add(object, new SphereGeometry(0.045, 8, 6), white, 0.2, height - 0.04, 0);
  return { object, dispose: disposer(object) };
}

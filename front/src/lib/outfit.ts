import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Matrix4,
  Mesh,
  type Material,
  type Object3D,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { habiller } from "./accessories/accessoires.js";
import type { Coincoin } from "./coincoin.js";

/** La tenue posée sur un canard : elle clignote avec lui et libère sa mémoire avec lui. */
export interface Dressing {
  /** Ce qui a été ajouté au canard. */
  object: Object3D;
  setOpacity(opacity: number): void;
  dispose(): void;
}

/**
 * Ce qui fait l'aspect d'un matériau : deux matériaux qui coïncident ici se dessinent pareil. Chaque
 * pièce crée le sien, même quand deux volumes ont la même couleur.
 */
function look(material: Material): string {
  const m = material as Material & {
    color?: Color;
    emissive?: Color;
    map?: { uuid: string } | null;
    flatShading?: boolean;
    vertexColors?: boolean;
  };
  return [
    m.type,
    m.color?.getHex(),
    m.emissive?.getHex(),
    m.map?.uuid,
    m.flatShading,
    m.vertexColors,
    m.opacity,
    m.transparent,
    m.side,
    m.depthWrite,
    m.depthTest,
    m.blending,
    m.alphaTest,
  ].join("|");
}

const KEPT_ATTRIBUTES = ["position", "normal", "uv"];

/** La forme d'une pièce, replacée une fois pour toutes dans le repère de la tenue. */
function baked(mesh: Mesh, toWorn: Matrix4): BufferGeometry {
  const geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
  for (const name of Object.keys(geometry.attributes)) {
    if (!KEPT_ATTRIBUTES.includes(name)) geometry.deleteAttribute(name);
  }
  if (!geometry.attributes.normal) geometry.computeVertexNormals();
  if (!geometry.attributes.uv) {
    const count = geometry.attributes.position!.count;
    geometry.setAttribute("uv", new Float32BufferAttribute(new Float32Array(count * 2), 2));
  }
  geometry.clearGroups();
  geometry.applyMatrix4(toWorn);
  if (toWorn.determinant() < 0) {
    // Une pièce en miroir se dessinait à l'endroit grâce à son échelle négative : on inverse le sens des faces.
    for (const attribute of Object.values(geometry.attributes)) {
      const size = attribute.itemSize;
      const array = attribute.array as Float32Array;
      for (let at = 0; at < array.length; at += size * 3) {
        for (let k = 0; k < size; k++) {
          const tmp = array[at + size + k]!;
          array[at + size + k] = array[at + 2 * size + k]!;
          array[at + 2 * size + k] = tmp;
        }
      }
    }
  }
  return geometry;
}

/**
 * Une pièce se compose de plusieurs volumes, chacun un appel de dessin : une tenue complète dépasse
 * la soixantaine, pour chaque canard de la partie. On réunit en un seul volume tous ceux qui ont le même
 * matériau : même image, bien moins d'appels (surtout sur téléphone).
 */
export function fuse(worn: Object3D, shared: ReadonlySet<unknown> = new Set()): void {
  worn.updateWorldMatrix(true, true);
  const toWorn = new Matrix4().copy(worn.matrixWorld).invert();
  const groups = new Map<unknown, Mesh[]>();
  worn.traverse((object) => {
    if (object.constructor !== Mesh) return;
    const mesh = object as Mesh;
    if (Array.isArray(mesh.material) || !mesh.visible || mesh.renderOrder !== 0) return;
    const key = shared.has(mesh.material) ? mesh.material : look(mesh.material);
    const list = groups.get(key);
    if (list) list.push(mesh);
    else groups.set(key, [mesh]);
  });
  for (const meshes of groups.values()) {
    if (meshes.length < 2) continue;
    const parts = meshes.map((mesh) =>
      baked(mesh, new Matrix4().multiplyMatrices(toWorn, mesh.matrixWorld)),
    );
    const merged = mergeGeometries(parts);
    for (const part of parts) part.dispose();
    if (!merged) continue;
    const material = meshes[0]!.material as Material;
    for (const mesh of meshes) {
      mesh.removeFromParent();
      if (!shared.has(mesh.geometry)) mesh.geometry.dispose();
      if (mesh.material !== material && !shared.has(mesh.material)) {
        (mesh.material as Material).dispose();
      }
    }
    worn.add(new Mesh(merged, material));
  }
}

export function dress(duck: Coincoin, ids: readonly string[]): Dressing {
  // Les pièces « couleur du canard » partagent ses matériaux et ses formes : c'est lui qui les gère.
  const shared = new Set<unknown>();
  duck.group.traverse((object) => {
    if (object instanceof Mesh) shared.add(object.geometry).add(object.material);
  });

  const worn = habiller(duck, ids);
  fuse(worn, shared);
  const materials = new Map<Material, number>();
  const geometries = new Set<Mesh["geometry"]>();
  worn.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    if (!shared.has(object.geometry)) geometries.add(object.geometry);
    const material = object.material as Material;
    if (!shared.has(material)) materials.set(material, material.opacity);
  });

  let current = 1;
  return {
    object: worn,
    setOpacity(opacity) {
      if (opacity === current) return;
      current = opacity;
      for (const [material, own] of materials) {
        // Une vitre déjà translucide reste translucide ; le reste le devient le temps du clignotement.
        const transparent = own < 1 || opacity < 1;
        if (material.transparent !== transparent) {
          material.transparent = transparent;
          material.needsUpdate = true;
        }
        material.opacity = own * opacity;
      }
    },
    dispose() {
      for (const item of [...geometries, ...materials.keys()]) item.dispose();
    },
  };
}

import { Mesh, type Material } from "three";
import { habiller } from "./accessories/accessoires.js";
import type { Coincoin } from "./coincoin.js";

/** La tenue posée sur un canard : elle clignote avec lui et libère sa mémoire avec lui. */
export interface Dressing {
  setOpacity(opacity: number): void;
  dispose(): void;
}

export function dress(duck: Coincoin, ids: readonly string[]): Dressing {
  // Les pièces « couleur du canard » partagent ses matériaux et ses formes : c'est lui qui les gère.
  const shared = new Set<unknown>();
  duck.group.traverse((object) => {
    if (object instanceof Mesh) shared.add(object.geometry).add(object.material);
  });

  const worn = habiller(duck, ids);
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

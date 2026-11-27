import { Mesh, Sprite, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import * as catalog from "./accessories/accessoires.js";
import { createCoincoin } from "./coincoin.js";
import { dress } from "./outfit.js";
import { PORTRAIT_CENTER, PORTRAIT_HALF, createStudioCamera } from "./portraitFrame.js";

const { ACCESSOIRES } = catalog;

/** Étendue d'une tenue dans l'image : de combien elle dépasse du cadre fixe (négatif : elle y tient). */
function overflow(outfit: readonly string[], back: boolean) {
  const camera = createStudioCamera();
  const duck = createCoincoin("#E69F00");
  for (const child of duck.group.children) {
    if (child instanceof Sprite && child.scale.x > 1) child.visible = false;
  }
  dress(duck, outfit);
  duck.group.rotation.y = back ? Math.PI : 0;
  duck.group.updateWorldMatrix(true, true);
  const center = back ? PORTRAIT_CENTER.back : PORTRAIT_CENTER.front;
  const point = new Vector3();
  let worst = -Infinity;
  duck.group.traverseVisible((object) => {
    if (!(object instanceof Mesh)) return;
    const vertices = object.geometry.getAttribute("position");
    for (let i = 0; i < vertices.count; i++) {
      point
        .fromBufferAttribute(vertices, i)
        .applyMatrix4(object.matrixWorld)
        .applyMatrix4(camera.matrixWorldInverse);
      worst = Math.max(worst, Math.abs(point.x - center.x), Math.abs(point.y - center.y));
    }
  });
  return worst - PORTRAIT_HALF;
}

describe("cadre fixe du portrait", () => {
  it("contient le canard nu et chaque pièce, de face et de dos", () => {
    for (const back of [false, true]) {
      expect(overflow([], back), "canard nu").toBeLessThan(0);
      for (const item of ACCESSOIRES) {
        expect(overflow([item.id], back), `${item.id} ${back ? "de dos" : "de face"}`).toBeLessThan(
          0,
        );
      }
    }
  });

  it("contient chaque tenue complète (thèmes et tenues de Coincoin)", () => {
    const outfits = Object.entries(catalog)
      .filter(([name]) => name.startsWith("THEMES") || name === "TENUES")
      .flatMap(([, list]) => list as catalog.Outfit[]);
    for (const outfit of outfits) {
      for (const back of [false, true]) {
        expect(
          overflow(outfit.pieces, back),
          `${outfit.nom} ${back ? "de dos" : "de face"}`,
        ).toBeLessThan(0);
      }
    }
  });
});

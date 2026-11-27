import { BoxGeometry, BufferGeometry, Color, Float32BufferAttribute } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { TILE_SIZE, type BoardMesh } from "./board.js";

/**
 * Toutes les cases du plateau en UNE géométrie, couleur portée par les sommets : un seul appel de
 * dessin au lieu d'un par case (près de 900 sur une carte 30×30). La carte ne change pas pendant une
 * partie, on la construit donc une fois et on la fige.
 */
export function mergeBoard(meshes: readonly BoardMesh[]): BufferGeometry {
  const color = new Color();
  const boxes = meshes.map((tile) => {
    const box = new BoxGeometry(TILE_SIZE, tile.height, TILE_SIZE).toNonIndexed();
    box.translate(tile.x + 0.5, tile.centerY, tile.y + 0.5);
    color.set(tile.color);
    const count = box.getAttribute("position").count;
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) color.toArray(colors, i * 3);
    box.setAttribute("color", new Float32BufferAttribute(colors, 3));
    return box;
  });
  if (boxes.length === 0) return new BufferGeometry();
  const merged = mergeGeometries(boxes, false);
  for (const box of boxes) box.dispose();
  return merged;
}

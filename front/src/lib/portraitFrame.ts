/**
 * La caméra des portraits du canard, et son cadre FIXE : le canard garde la même taille et la même
 * place quelle que soit la tenue, au lieu de se décaler quand une pièce dépasse (chapeau haut,
 * ailes...). Le cadre est dimensionné pour la plus grande tenue du catalogue, de face et de dos ;
 * un test (portraitFrame.spec.ts) échoue si une pièce déborde, auquel cas on agrandit PORTRAIT_HALF.
 */
import { OrthographicCamera } from "three";

/** La vue du canard dans les menus, celle de ses images d'origine : de trois quarts, bec à gauche. */
export const AZIMUTH = (35 * Math.PI) / 180;
export const ELEVATION = (20 * Math.PI) / 180;
export const LOOK_AT = 0.72;
export const DISTANCE = 6;

/** Demi-côté du cadre carré, en unités du monde (la plus grande tenue fait 1,73 de côté, marge comprise). */
export const PORTRAIT_HALF = 0.92;
/** Centre du cadre dans le repère de la caméra : décalé du côté où dépassent bec, ailes et objets tenus. */
export const PORTRAIT_CENTER = { front: { x: 0.15, y: 0 }, back: { x: -0.15, y: 0 } } as const;

export function createStudioCamera(): OrthographicCamera {
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 50);
  camera.position.set(
    DISTANCE * Math.cos(ELEVATION) * Math.sin(AZIMUTH),
    LOOK_AT + DISTANCE * Math.sin(ELEVATION),
    DISTANCE * Math.cos(ELEVATION) * Math.cos(AZIMUTH),
  );
  camera.lookAt(0, LOOK_AT, 0);
  camera.updateMatrixWorld();
  return camera;
}

/** Le même cadre pour tous les portraits d'un côté donné. */
export function applyPortraitFrame(camera: OrthographicCamera, back: boolean) {
  const { x, y } = back ? PORTRAIT_CENTER.back : PORTRAIT_CENTER.front;
  camera.left = x - PORTRAIT_HALF;
  camera.right = x + PORTRAIT_HALF;
  camera.top = y + PORTRAIT_HALF;
  camera.bottom = y - PORTRAIT_HALF;
  camera.updateProjectionMatrix();
}

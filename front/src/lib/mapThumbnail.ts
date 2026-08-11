import {
  AmbientLight,
  BoxGeometry,
  Color,
  DirectionalLight,
  Mesh,
  MeshStandardMaterial,
  OrthographicCamera,
  Scene,
  WebGLRenderer,
} from "three";
import {
  boardBackground,
  buildBoardMeshes,
  computeIsometricFrame,
  isWebglAvailable,
  TILE_SIZE,
  type BoardTheme,
} from "./board.js";
import type { EditorMap } from "./mapEditor.js";
import { toPlacedTiles } from "./mapEditor.js";

/**
 * Vignettes isométriques des cartes du joueur, rendues en IMAGES plutôt qu'en
 * aperçus vivants.
 *
 * Ce n'est pas une optimisation, c'est la seule façon d'afficher une grille.
 * Chaque BoardPreview monte son propre canvas, donc son propre contexte WebGL,
 * et un navigateur en refuse au-delà d'une poignée (une quinzaine selon les
 * moteurs) : passé la limite, il éteint les plus anciens, et les premières
 * cartes de la page virent au noir les unes après les autres. C'est déjà la
 * raison pour laquelle les cartes officielles défilent en carrousel au lieu de
 * s'empiler (voir molecules/MapPreviewList.vue).
 *
 * Une vignette n'a de toute façon pas besoin d'être vivante : rien n'y bouge.
 * On dessine donc chaque carte une fois, dans UN renderer partagé, et on en
 * garde une image. Le nombre de cartes affichables n'a plus de limite, et la
 * grille défile sans rien recalculer.
 *
 * La géométrie vient de board.ts, comme le rendu d'une partie : une vignette
 * qui ne ressemblerait pas au plateau réellement joué serait pire que pas de
 * vignette du tout.
 */

/**
 * Taille de rendu, en pixels. Large : la vignette est affichée en CSS bien plus
 * petit, mais elle sert aussi d'aperçu agrandi, et un PNG remis à l'échelle
 * vers le haut est immédiatement laid.
 */
const RENDER_WIDTH = 640;
const RENDER_HEIGHT = 480;

/**
 * Cadrage plus serré que celui d'une partie : la marge par défaut existe pour
 * que les canards ne jouent pas collés aux bords, et il n'y a aucun canard ici.
 * Même valeur que l'aperçu des cartes officielles, pour que les deux écrans se
 * ressemblent.
 */
const THUMBNAIL_FIT = 0.44;

interface Renderer {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: OrthographicCamera;
  geometry: BoxGeometry;
}

let shared: Renderer | undefined;
/** `true` une fois qu'on sait que ce navigateur ne rendra jamais rien. */
let unavailable = false;

function acquire(): Renderer | undefined {
  if (unavailable) return undefined;
  if (shared) return shared;

  if (!isWebglAvailable()) {
    unavailable = true;
    return undefined;
  }

  try {
    const renderer = new WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(RENDER_WIDTH, RENDER_HEIGHT, false);
    // Une seule image par carte, jamais réaffichée : inutile de payer le
    // pixel ratio d'un écran haute densité par-dessus une taille déjà large.
    renderer.setPixelRatio(1);
    renderer.shadowMap.enabled = true;

    const scene = new Scene();
    // Mêmes lumières que BoardPreview, aux mêmes valeurs : une ambiante faible
    // et une directionnelle marquée, sans quoi toutes les faces reçoivent
    // autant de lumière et le relief disparaît.
    scene.add(new AmbientLight(0xffffff, 0.35));
    const sun = new DirectionalLight(0xffffff, 1.3);
    sun.position.set(10, 20, 10);
    // L'ombre portée fait la moitié du volume. L'oublier ici donnait une
    // vignette plus plate que le plateau qu'elle est censée annoncer — et
    // c'est précisément ce qu'on cherche à éviter en partageant board.ts.
    //
    // Le tronc d'ombre reste celui par défaut, comme dans BoardPreview : les
    // deux rendus se ressemblent, y compris dans leurs limites. S'il faut un
    // jour cadrer cette ombre sur le plateau, c'est aux DEUX endroits.
    sun.castShadow = true;
    scene.add(sun);

    shared = {
      renderer,
      scene,
      camera: new OrthographicCamera(-1, 1, 1, -1, 0.1, 1000),
      // Une seule géométrie pour toutes les cases de toutes les cartes : elles
      // ont la même empreinte au sol, seule leur hauteur change (via l'échelle).
      geometry: new BoxGeometry(TILE_SIZE, 1, TILE_SIZE),
    };
    return shared;
  } catch {
    // Contexte refusé (mémoire, pilote, sandbox) : la page doit rester
    // utilisable sans vignettes, pas planter.
    unavailable = true;
    return undefined;
  }
}

/**
 * Image PNG (data URL) d'une carte, ou `undefined` si ce navigateur ne sait
 * pas rendre de 3D — à l'appelant d'afficher autre chose plutôt que de
 * supposer qu'il y aura toujours une image (voir molecules/MapCard.vue).
 */
export function renderMapThumbnail(map: EditorMap, theme: BoardTheme = "dark"): string | undefined {
  const context = acquire();
  if (!context) return undefined;

  const { renderer, scene, camera, geometry } = context;

  const meshes = buildBoardMeshes({
    width: map.width,
    height: map.height,
    tiles: toPlacedTiles(map),
    theme,
  });

  const drawn: Mesh[] = [];
  for (const tile of meshes) {
    const mesh = new Mesh(geometry, new MeshStandardMaterial({ color: new Color(tile.color) }));
    // La géométrie fait une unité de haut : l'échelle porte la hauteur réelle,
    // ce qui évite une BoxGeometry par case.
    mesh.scale.set(1, tile.height, 1);
    mesh.position.set(tile.x + 0.5, tile.centerY, tile.y + 0.5);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    drawn.push(mesh);
  }

  const frame = computeIsometricFrame(map.width, map.height, THUMBNAIL_FIT);
  const aspect = RENDER_WIDTH / RENDER_HEIGHT;
  camera.left = -frame.viewSize * aspect;
  camera.right = frame.viewSize * aspect;
  camera.top = frame.viewSize;
  camera.bottom = -frame.viewSize;
  camera.up.set(...frame.up);
  camera.position.set(...frame.position);
  camera.lookAt(...frame.target);
  camera.updateProjectionMatrix();

  renderer.setClearColor(new Color(boardBackground(theme)), 1);
  renderer.render(scene, camera);
  const image = renderer.domElement.toDataURL("image/png");

  // La scène est vidée AVANT le prochain rendu, pas après le dernier : deux
  // cartes dessinées l'une après l'autre se superposeraient sinon. Les
  // matériaux sont propres à chaque case, donc libérés ici ; la géométrie,
  // partagée, ne l'est jamais.
  for (const mesh of drawn) {
    scene.remove(mesh);
    (mesh.material as MeshStandardMaterial).dispose();
  }

  return image;
}

/**
 * Libère le contexte WebGL partagé. À appeler quand plus aucune vignette n'est
 * à l'écran : un contexte inutilisé compte quand même dans le quota du
 * navigateur, et c'est justement ce quota qu'on essaie de préserver pour les
 * aperçus vivants des autres écrans.
 */
export function releaseThumbnailRenderer(): void {
  if (!shared) return;
  shared.geometry.dispose();
  shared.renderer.dispose();
  shared.renderer.forceContextLoss();
  shared = undefined;
}

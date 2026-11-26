/**
 * Les images fixes du canard et des accessoires, dessinées à la demande depuis le catalogue : rien à
 * régénérer quand on ajoute une pièce. Un seul contexte WebGL sert à toutes (le navigateur en limite
 * le nombre), et chaque image n'est dessinée qu'une fois. `undefined` sans WebGL.
 */
import {
  DirectionalLight,
  HemisphereLight,
  Mesh,
  OrthographicCamera,
  Scene,
  Sprite,
  Vector3,
  WebGLRenderer,
  type Object3D,
} from "three";
import { ANTENNA_COLORS, createCoincoin } from "./coincoin.js";
import { dress } from "./outfit.js";

const THUMBNAIL_SIZE = 256;
const DUCK_SIZE = 512;
/** La vue du canard dans les menus, celle de ses images d'origine : de trois quarts, bec à gauche. */
const AZIMUTH = (35 * Math.PI) / 180;
const ELEVATION = (20 * Math.PI) / 180;
const LOOK_AT = 0.72;
const DISTANCE = 6;
const cache = new Map<string, string>();
let studio:
  { renderer: WebGLRenderer; scene: Scene; camera: OrthographicCamera } | null | undefined;

function openStudio() {
  if (studio !== undefined) return studio;
  try {
    const renderer = new WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    const scene = new Scene();
    scene.add(new HemisphereLight(0xffffff, 0x9a9690, 2.0));
    const sun = new DirectionalLight(0xffffff, 1.6);
    sun.position.set(-1, 6, 5);
    scene.add(sun);
    const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 50);
    camera.position.set(
      DISTANCE * Math.cos(ELEVATION) * Math.sin(AZIMUTH),
      LOOK_AT + DISTANCE * Math.sin(ELEVATION),
      DISTANCE * Math.cos(ELEVATION) * Math.cos(AZIMUTH),
    );
    camera.lookAt(0, LOOK_AT, 0);
    camera.updateMatrixWorld();
    studio = { renderer, scene, camera };
  } catch {
    studio = null;
  }
  return studio;
}

/**
 * Cadre carré, centré sur ce qui est visible. Mesuré sur les sommets vus par la caméra : une boîte
 * alignée sur les axes, regardée de biais, déborde d'un côté et décentre l'image.
 */
function frame(camera: OrthographicCamera, subject: Object3D) {
  const low = new Vector3(Infinity, Infinity, 0);
  const high = new Vector3(-Infinity, -Infinity, 0);
  const point = new Vector3();
  subject.updateWorldMatrix(true, true);
  subject.traverseVisible((object) => {
    if (!(object instanceof Mesh)) return;
    const vertices = object.geometry.getAttribute("position");
    for (let i = 0; i < vertices.count; i++) {
      point
        .fromBufferAttribute(vertices, i)
        .applyMatrix4(object.matrixWorld)
        .applyMatrix4(camera.matrixWorldInverse);
      low.min(point);
      high.max(point);
    }
  });
  const half = (Math.max(high.x - low.x, high.y - low.y) / 2) * 1.06;
  const centerX = (low.x + high.x) / 2;
  const centerY = (low.y + high.y) / 2;
  camera.left = centerX - half;
  camera.right = centerX + half;
  camera.top = centerY + half;
  camera.bottom = centerY - half;
  camera.updateProjectionMatrix();
}

interface Shot {
  color: string;
  outfit: readonly string[];
  size: number;
  /** L'accessoire seul, sans le canard. */
  alone?: boolean;
  back?: boolean;
}

function picture({ color, outfit, size, alone = false, back = false }: Shot) {
  const key = `${size}|${color}|${alone}|${back}|${outfit.join(",")}`;
  const known = cache.get(key);
  if (known) return known;
  const room = openStudio();
  if (!room) return undefined;

  const duck = createCoincoin(color);
  duck.setAntennaColor(ANTENNA_COLORS[1]);
  // L'aura est ajoutée par l'interface (classe duck-glow) : ici elle fausserait le cadrage.
  for (const child of duck.group.children) {
    if (child instanceof Sprite && child.scale.x > 1) child.visible = false;
  }
  const body = [...duck.group.children];
  const dressing = dress(duck, outfit);
  // L'accessoire seul : on cache le canard et on garde ce qu'on vient d'ajouter.
  if (alone) for (const child of body) child.visible = false;
  duck.group.rotation.y = back ? Math.PI : 0;

  room.scene.add(duck.group);
  frame(room.camera, duck.group);
  room.renderer.setSize(size, size, false);
  room.renderer.render(room.scene, room.camera);
  const url = room.renderer.domElement.toDataURL("image/png");
  room.scene.remove(duck.group);
  dressing.dispose();
  duck.dispose();
  cache.set(key, url);
  return url;
}

export const renderDuck = (color: string, outfit: readonly string[], back = false) =>
  picture({ color, outfit, back, size: DUCK_SIZE });

export const renderAccessory = (id: string, color: string) =>
  picture({ color, outfit: [id], alone: true, size: THUMBNAIL_SIZE });

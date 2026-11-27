/**
 * La scène vivante du fond : un seul canvas transparent, la caméra du jeu (isométrique), et des
 * dioramas posés de part et d'autre de la page. Les canards bougent selon motion.ts.
 */
import {
  DirectionalLight,
  Group,
  HemisphereLight,
  OrthographicCamera,
  Scene,
  Vector3,
  WebGLRenderer,
} from "three";
import { createCoincoin, type Coincoin } from "../coincoin.js";
import { dress, type Dressing } from "../outfit.js";
import { poseAt, type Placement } from "./motion.js";
import type { SceneDefinition, SceneProp } from "./noel.js";
import { cane, gift, sack, slab, snowfall, snowman, tree, type Prop } from "./props.js";

const AZIMUTH = (40 * Math.PI) / 180;
const ELEVATION = (30 * Math.PI) / 180;
const DISTANCE = 30;
/** Les canards sont un peu agrandis : ils sont l'attraction, plus que le décor. */
const DUCK_SCALE = 1.5;

interface Actor {
  placement: Placement;
  duck: Coincoin;
  dressing: Dressing;
  group: Group;
}

function buildProp(prop: SceneProp): Prop {
  switch (prop.kind) {
    case "tree":
      return tree(prop.height);
    case "gift":
      return gift(prop.color, prop.ribbon, prop.size);
    case "snowman":
      return snowman();
    case "sack":
      return sack();
    case "cane":
      return cane();
  }
}

export interface Stage {
  /** Redessine à l'instant donné (en secondes). */
  render(time: number): void;
  resize(width: number, height: number): void;
  dispose(): void;
}

export interface StageOptions {
  /**
   * Ne montre que ce diorama, centré dans l'image : c'est ainsi qu'on fabrique les images fixes des
   * pages (scripts/render-scenes.mjs). Sans cela, tous sont posés de part et d'autre de la fenêtre.
   */
  only?: number;
  /** Garde l'image dessinée, pour pouvoir la lire (capture, export). */
  preserve?: boolean;
  pixelRatio?: number;
}

export function createStage(
  canvas: HTMLCanvasElement,
  definition: SceneDefinition,
  options: StageOptions = {},
): Stage {
  const renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: options.preserve ?? false,
  });
  renderer.setPixelRatio(options.pixelRatio ?? Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  scene.add(new HemisphereLight(0xffffff, 0x9a9690, 2.0));
  const sun = new DirectionalLight(0xffffff, 1.6);
  sun.position.set(-4, 10, 6);
  scene.add(sun);

  const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
  camera.position.set(
    DISTANCE * Math.cos(ELEVATION) * Math.sin(AZIMUTH),
    DISTANCE * Math.sin(ELEVATION),
    DISTANCE * Math.cos(ELEVATION) * Math.cos(AZIMUTH),
  );
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();

  const props: Prop[] = [];
  const actors: Actor[] = [];
  const shown = definition.dioramas.filter(
    (_, i) => options.only === undefined || i === options.only,
  );
  const roots = shown.map((diorama) => {
    const root = new Group();
    const floor = slab(diorama.size);
    props.push(floor);
    root.add(floor.object);
    for (const description of diorama.props) {
      const prop = buildProp(description);
      prop.object.position.set(description.x, 0, description.z);
      if (description.kind === "gift" || description.kind === "cane")
        prop.object.rotation.y = description.turn ?? 0;
      props.push(prop);
      root.add(prop.object);
    }
    for (const description of diorama.actors) {
      const duck = createCoincoin(description.color);
      const dressing = dress(duck, description.outfit);
      const group = duck.group;
      group.scale.setScalar(DUCK_SCALE);
      root.add(group);
      actors.push({ placement: description, duck, dressing, group });
    }
    scene.add(root);
    return root;
  });

  let snow: Prop | undefined;
  if (definition.snow) {
    snow = snowfall(260, { x: 30, z: 30, height: 14 });
    snow.object.position.set(-15, 0, -15);
    scene.add(snow.object);
  }

  /** Le point du sol qui s'affiche en (ndcX, ndcY) : où poser le centre d'une dalle. */
  function ground(ndcX: number, ndcY: number): Vector3 {
    const origin = new Vector3(ndcX, ndcY, -1).unproject(camera);
    const direction = new Vector3();
    camera.getWorldDirection(direction);
    return origin.addScaledVector(direction, -origin.y / direction.y);
  }

  let width = 1;
  let height = 1;
  function resize(w: number, h: number) {
    width = Math.max(1, w);
    height = Math.max(1, h);
    renderer.setSize(width, height, false);
    // Une unité du monde = une part fixe de la largeur : la scène suit la taille de la fenêtre.
    const single = options.only !== undefined;
    const pixelsPerUnit = single
      ? width / ((shown[0]?.size ?? 5) * 1.55)
      : Math.min(width * 0.032, height * 0.1);
    camera.left = -width / 2 / pixelsPerUnit;
    camera.right = width / 2 / pixelsPerUnit;
    camera.top = height / 2 / pixelsPerUnit;
    camera.bottom = -height / 2 / pixelsPerUnit;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    shown.forEach((diorama, i) => {
      // Seul : la dalle un peu sous le milieu de l'image, pour laisser de la place au sapin.
      const target = single ? { x: 0.5, y: 0.66 } : diorama.at;
      roots[i]!.position.copy(ground(target.x * 2 - 1, 1 - target.y * 2));
    });
  }

  return {
    render(time) {
      for (const prop of props) prop.update?.(time);
      snow?.update?.(time);
      for (const { placement, group } of actors) {
        const pose = poseAt(placement, time);
        group.position.set(pose.x, pose.y, pose.z);
        group.rotation.set(0, pose.heading, pose.tilt);
      }
      renderer.render(scene, camera);
    },
    resize,
    dispose() {
      for (const prop of props) prop.dispose();
      snow?.dispose();
      for (const { duck, dressing } of actors) {
        dressing.dispose();
        duck.dispose();
      }
      renderer.dispose();
    },
  };
}

/**
 * Rend une scène pleine page : le sol, les décors et les canards, vus par la caméra isométrique du
 * jeu. Sert à fabriquer l'image de fond de chaque saison (scripts/render-scenes.mjs) ; le site, lui,
 * n'affiche que cette image.
 */
import {
  DirectionalLight,
  Group,
  HemisphereLight,
  OrthographicCamera,
  Scene,
  WebGLRenderer,
} from "three";
import { createCoincoin, type Coincoin } from "../coincoin.js";
import { dress, type Dressing } from "../outfit.js";
import { poseAt, type Placement } from "./motion.js";
import type { Edition, Layout, SceneProp } from "./types.js";
import {
  cane,
  drift,
  floor,
  gift,
  lamppost,
  sack,
  sleigh,
  snowfall,
  snowman,
  tree,
  type Prop,
} from "./props.js";

const AZIMUTH = (40 * Math.PI) / 180;
const ELEVATION = (30 * Math.PI) / 180;
const DISTANCE = 60;
/** Les canards sont un peu agrandis : ils sont l'attraction, plus que le décor. */
const DUCK_SCALE = 2;

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
    case "lamppost":
      return lamppost();
    case "sleigh":
      return sleigh();
    case "drift":
      return drift(prop.radius);
  }
}

export interface Stage {
  /** Dessine la scène à l'instant donné (en secondes) : les canards y prennent la pose du moment. */
  render(time: number): void;
  resize(width: number, height: number): void;
  dispose(): void;
}

export function createStage(canvas: HTMLCanvasElement, edition: Edition, layout: Layout): Stage {
  const renderer = new WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setClearColor(0x0f1218, 1);

  const scene = new Scene();
  scene.add(new HemisphereLight(0xd8e4ff, 0x6b7a99, 1.9));
  const sun = new DirectionalLight(0xfff1dc, 1.7);
  sun.position.set(-8, 14, 9);
  scene.add(sun);

  const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 400);
  camera.position.set(
    DISTANCE * Math.cos(ELEVATION) * Math.sin(AZIMUTH),
    DISTANCE * Math.sin(ELEVATION),
    DISTANCE * Math.cos(ELEVATION) * Math.cos(AZIMUTH),
  );
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();

  const props: Prop[] = [];
  // Le sol doit couvrir tout le cadre, quel qu'en soit le format : on le dimensionne sur sa diagonale.
  const unit = layout.width / layout.units;
  const depthRange = layout.height / unit / Math.sin(ELEVATION);
  const ground = floor(Math.ceil(2 * Math.hypot(layout.units / 2, depthRange / 2)) + 6);
  props.push(ground);
  scene.add(ground.object);
  for (const description of layout.props) {
    const prop = buildProp(description);
    prop.object.position.set(description.x, 0, description.z);
    if ("turn" in description) prop.object.rotation.y = description.turn ?? 0;
    props.push(prop);
    scene.add(prop.object);
  }

  const actors: Actor[] = [];
  for (const description of layout.actors) {
    const duck = createCoincoin(description.color);
    const dressing = dress(duck, description.outfit);
    duck.group.scale.setScalar(DUCK_SCALE);
    scene.add(duck.group);
    actors.push({ placement: description, duck, dressing, group: duck.group });
  }

  let snow: Prop | undefined;
  if (edition.snow) {
    const reach = Math.ceil(Math.hypot(layout.units, depthRange)) + 8;
    snow = snowfall(Math.round(reach * 15), { x: reach, z: reach, height: 18 });
    snow.object.position.set(-reach / 2, 0, -reach / 2);
    scene.add(snow.object);
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
    resize(width, height) {
      renderer.setSize(width, height, false);
      const unit = width / layout.units;
      camera.left = -width / 2 / unit;
      camera.right = width / 2 / unit;
      camera.top = height / 2 / unit;
      camera.bottom = -height / 2 / unit;
      camera.updateProjectionMatrix();
    },
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

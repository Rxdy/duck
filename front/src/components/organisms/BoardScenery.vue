<script setup lang="ts">
// Le paysage d'une carte, à dessiner DANS un TresCanvas : l'herbe, en un seul appel de dessin
// (une touffe = une instance). Elle ondule au vent, calculé par la carte graphique : rien à faire
// côté processeur image par image, sauf avancer l'horloge du vent.
import { onMounted, onUnmounted, watch } from "vue";
import {
  Color,
  ConeGeometry,
  DynamicDrawUsage,
  InstancedMesh,
  MeshLambertMaterial,
  Object3D,
  type BufferGeometry,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { grassTufts, hash2 } from "../../lib/scenery.js";

const props = defineProps<{
  /** Cases de sol libres où l'herbe peut pousser. */
  tiles: readonly { x: number; y: number }[];
  /** Faux : herbe immobile (animations réduites). */
  animated: boolean;
}>();
const emit = defineEmits<{ slow: [] }>();

const BLADE_HEIGHT = 0.2;
const uTime = { value: 0 };

function tuftGeometry(): BufferGeometry {
  const blades = [-0.05, 0, 0.05].map((offset, i) => {
    const blade = new ConeGeometry(0.035, BLADE_HEIGHT, 3, 1).toNonIndexed();
    blade.translate(0, BLADE_HEIGHT / 2, 0);
    blade.rotateZ((i - 1) * 0.28);
    blade.translate(offset, 0, 0);
    return blade;
  });
  const merged = mergeGeometries(blades, false);
  for (const blade of blades) blade.dispose();
  return merged;
}

const material = new MeshLambertMaterial({ color: "#ffffff" });
material.onBeforeCompile = (shader) => {
  shader.uniforms.uTime = uTime;
  shader.vertexShader = shader.vertexShader
    .replace("void main() {", "uniform float uTime;\nvoid main() {")
    .replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
      // Le vent plie la pointe des brins, jamais leur pied.
      float sway = sin(uTime * 1.7 + instanceMatrix[3].x * 1.3 + instanceMatrix[3].z * 0.9);
      transformed.x += sway * 0.06 * (position.y / ${BLADE_HEIGHT.toFixed(2)});`,
    );
};

const geometry = tuftGeometry();
const GREENS = ["#4f8a45", "#5a9a4d", "#468040"].map((c) => new Color(c));
let mesh: InstancedMesh | undefined;
const placeholder = new Object3D();

function build() {
  const tufts = grassTufts(props.tiles);
  if (mesh) {
    placeholder.remove(mesh);
    mesh.dispose();
  }
  mesh = new InstancedMesh(geometry, material, Math.max(1, tufts.length));
  mesh.instanceMatrix.setUsage(DynamicDrawUsage);
  mesh.frustumCulled = false;
  const dummy = new Object3D();
  tufts.forEach((tuft, i) => {
    dummy.position.set(tuft.x, 0.002, tuft.z);
    dummy.rotation.set(0, tuft.rotation, 0);
    dummy.scale.setScalar(tuft.scale);
    dummy.updateMatrix();
    mesh!.setMatrixAt(i, dummy.matrix);
    mesh!.setColorAt(i, GREENS[Math.floor(hash2(tuft.x * 7, tuft.z * 7) * GREENS.length)]!);
  });
  mesh.count = tufts.length;
  placeholder.add(mesh);
}
build();
watch(() => props.tiles, build);

// Horloge du vent. Si la machine n'arrive pas à suivre, on le dit : la carte repasse en tactique.
let frame: number | undefined;
let last = 0;
let counted = 0;
let slowFrames = 0;
const WARMUP_FRAMES = 40;
const WINDOW_FRAMES = 90;
const SLOW_MS = 28;

function tick(now: number) {
  frame = requestAnimationFrame(tick);
  const dt = now - last;
  last = now;
  if (props.animated) uTime.value = now / 1000;
  if (dt <= 0 || dt > 250) return; // onglet caché ou reprise : pas une mesure
  counted++;
  if (counted <= WARMUP_FRAMES) return;
  slowFrames += dt;
  if (counted - WARMUP_FRAMES === WINDOW_FRAMES) {
    if (slowFrames / WINDOW_FRAMES > SLOW_MS) emit("slow");
    counted = WARMUP_FRAMES;
    slowFrames = 0;
  }
}
onMounted(() => (frame = requestAnimationFrame(tick)));
onUnmounted(() => {
  if (frame !== undefined) cancelAnimationFrame(frame);
  mesh?.dispose();
  geometry.dispose();
  material.dispose();
});
</script>

<template>
  <primitive :object="placeholder" />
</template>

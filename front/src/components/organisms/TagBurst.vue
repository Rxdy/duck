<script setup lang="ts">
// L'éclat d'un toucher, dans la couleur de l'attaquant : un anneau qui s'ouvre au ras du sol et
// quelques éclats qui jaillissent, sur la case du contact. À dessiner dans un TresCanvas.
import { onMounted, onUnmounted } from "vue";
import { AdditiveBlending, BoxGeometry, Group, Mesh, MeshBasicMaterial, RingGeometry } from "three";
import { useSettingsStore } from "../../store/settingsStore.js";

const props = defineProps<{ x: number; y: number; color: string; at: number }>();
const emit = defineEmits<{ done: [] }>();

const DURATION_MS = 420;
const SPARKS = 7;
const settings = useSettingsStore();

const group = new Group();
group.position.set(props.x + 0.5, 0.04, props.y + 0.5);
group.visible = false;
const material = new MeshBasicMaterial({
  color: props.color,
  transparent: true,
  blending: AdditiveBlending,
  depthWrite: false,
});
const ring = new Mesh(new RingGeometry(0.3, 0.42, 32), material);
ring.rotation.x = -Math.PI / 2;
group.add(ring);
const sparkGeometry = new BoxGeometry(0.07, 0.07, 0.07);
const sparks = Array.from({ length: SPARKS }, (_, i) => {
  const spark = new Mesh(sparkGeometry, material);
  spark.userData.angle = (i / SPARKS) * Math.PI * 2 + 0.4;
  group.add(spark);
  return spark;
});

let frame: number | undefined;
function tick() {
  const t = (performance.now() - props.at) / DURATION_MS;
  if (t >= 1) {
    emit("done");
    return;
  }
  frame = requestAnimationFrame(tick);
  if (t < 0) return;
  group.visible = true;
  const out = 1 - Math.pow(1 - t, 3);
  ring.scale.setScalar(0.6 + out * 1.4);
  material.opacity = 1 - t;
  for (const spark of sparks) {
    const a = spark.userData.angle as number;
    spark.position.set(
      Math.cos(a) * out * 0.7,
      0.15 + Math.sin(Math.PI * t) * 0.5,
      Math.sin(a) * out * 0.7,
    );
    spark.rotation.set(t * 6, t * 4, 0);
  }
}
onMounted(() => {
  // Animations réduites : pas d'éclat, le retour à la base suffit.
  if (settings.reducedMotion) emit("done");
  else tick();
});
onUnmounted(() => {
  if (frame !== undefined) cancelAnimationFrame(frame);
  ring.geometry.dispose();
  sparkGeometry.dispose();
  material.dispose();
});
</script>

<template>
  <primitive :object="group" />
</template>

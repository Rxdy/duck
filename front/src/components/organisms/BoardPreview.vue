<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { OrthographicCamera, Plane, Raycaster, Vector2, Vector3 } from "three";
import { TresCanvas } from "@tresjs/core";
import {
  buildBoardTiles,
  computeIsometricFrame,
  computeTopDownFrame,
  isWebglAvailable,
  tileColor,
} from "../../lib/board.js";
import type { TileKind } from "../../lib/mapEditor.js";

const props = withDefaults(
  defineProps<{
    width: number;
    height: number;
    players?: { id: string; x: number; y: number; color: string }[];
    // "isometric" pour une partie en cours (rendu), "topDown" pour l'éditeur
    // (placement précis des éléments, voir docs/04-editeur-cartes.md).
    mode?: "isometric" | "topDown";
    // Données réelles de l'éditeur (mur/spawn/vide par case). Sans ça, damier
    // par défaut (cas de l'aperçu pendant une partie en cours).
    tiles?: { x: number; y: number; kind: TileKind }[];
    // Active le clic pour poser un élément (éditeur uniquement).
    editable?: boolean;
  }>(),
  { mode: "isometric", editable: false },
);

const emit = defineEmits<{ tileClick: [x: number, y: number] }>();

const DUCK_SIZE = 0.8;
const FLOOR_HEIGHT = 0.25;
// Un mur qui dépasse la hauteur du canard gênerait la lecture du jeu vu de
// dessus/en isométrique : on reste sous sa taille, ici la moitié.
const WALL_HEIGHT = DUCK_SIZE / 2;

const renderTiles = computed(() => {
  const overrides = new Map(props.tiles?.map((t) => [`${t.x},${t.y}`, t.kind]));
  return buildBoardTiles(props.width, props.height).map((t) => {
    const kind = overrides.get(`${t.x},${t.y}`);
    const height = kind === "wall" ? WALL_HEIGHT : FLOOR_HEIGHT;
    return {
      x: t.x,
      y: t.y,
      color: tileColor(kind, t.shade),
      height,
      // Toutes les cases partagent la même base (-FLOOR_HEIGHT) : un mur pousse
      // vers le haut depuis le sol au lieu de flotter ou d'être enterré.
      centerY: -FLOOR_HEIGHT + height / 2,
    };
  });
});

// Certains navigateurs/webviews ne peuvent créer aucun contexte WebGL : on le
// vérifie avant de monter TresCanvas pour éviter un crash silencieux (voir
// isWebglAvailable dans lib/board.ts).
const webglAvailable = ref(true);
onMounted(() => {
  webglAvailable.value = isWebglAvailable();
});

const TILE_SIZE = 0.94;

const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);

// L'aspect ratio doit venir du conteneur RÉEL du canvas, pas de la fenêtre :
// sinon les cases s'étirent dès que la page a un header/titre/boutons au-dessus
// (le conteneur n'a alors plus le même ratio que window.innerWidth/innerHeight).
const containerRef = ref<HTMLElement | null>(null);
const containerAspect = ref(1);
let resizeObserver: ResizeObserver | undefined;

function updateCamera() {
  const frame =
    props.mode === "topDown"
      ? computeTopDownFrame(props.width, props.height)
      : computeIsometricFrame(props.width, props.height);

  camera.left = -frame.viewSize * containerAspect.value;
  camera.right = frame.viewSize * containerAspect.value;
  camera.top = frame.viewSize;
  camera.bottom = -frame.viewSize;
  camera.near = 0.1;
  camera.far = 1000;
  camera.up.set(...frame.up);
  camera.position.set(...frame.position);
  camera.lookAt(...frame.target);
  camera.updateProjectionMatrix();
}

onMounted(() => {
  if (!containerRef.value) return;
  resizeObserver = new ResizeObserver((entries) => {
    const rect = entries[0]?.contentRect;
    if (rect && rect.height > 0) {
      containerAspect.value = rect.width / rect.height;
      updateCamera();
    }
  });
  resizeObserver.observe(containerRef.value);
});
onUnmounted(() => resizeObserver?.disconnect());

// Recadre à chaque changement de taille ou de mode de vue.
watch([() => props.width, () => props.height, () => props.mode], updateCamera, { immediate: true });

// Clic -> case du plateau, via un rayon caméra/souris intersecté avec le sol
// (robuste quel que soit l'angle/type de caméra, contrairement à un calcul
// manuel à partir du frustum).
const raycaster = new Raycaster();
const groundPlane = new Plane(new Vector3(0, 1, 0), 0);

function handleClick(event: MouseEvent) {
  if (!props.editable || !containerRef.value) return;

  const rect = containerRef.value.getBoundingClientRect();
  const ndc = new Vector2(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1,
  );
  raycaster.setFromCamera(ndc, camera);

  const point = new Vector3();
  if (!raycaster.ray.intersectPlane(groundPlane, point)) return;

  emit("tileClick", Math.floor(point.x), Math.floor(point.z));
}
</script>

<template>
  <div ref="containerRef" class="h-full w-full" @click="handleClick">
    <TresCanvas v-if="webglAvailable" :camera="camera">
      <TresAmbientLight :intensity="0.8" />
      <TresDirectionalLight :position="[10, 20, 10]" :intensity="0.7" />

      <TresMesh
        v-for="tile in renderTiles"
        :key="`${tile.x}-${tile.y}`"
        :position="[tile.x + 0.5, tile.centerY, tile.y + 0.5]"
      >
        <TresBoxGeometry :args="[TILE_SIZE, tile.height, TILE_SIZE]" />
        <TresMeshStandardMaterial :color="tile.color" />
      </TresMesh>

      <TresMesh
        v-for="player in props.players ?? []"
        :key="player.id"
        :position="[player.x + 0.5, DUCK_SIZE / 2, player.y + 0.5]"
      >
        <TresBoxGeometry :args="[DUCK_SIZE, DUCK_SIZE, DUCK_SIZE]" />
        <TresMeshStandardMaterial :color="player.color" />
      </TresMesh>
    </TresCanvas>

    <div v-else class="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
      <p class="text-sm text-white/60">
        Le rendu 3D n'est pas disponible dans ce navigateur (WebGL désactivé ou non supporté).
      </p>
      <p class="text-xs text-white/40">
        Essaie d'ouvrir la page dans un navigateur avec l'accélération matérielle activée.
      </p>
    </div>
  </div>
</template>

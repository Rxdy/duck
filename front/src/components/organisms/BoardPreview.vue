<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { OrthographicCamera, Plane, Raycaster, Vector2, Vector3 } from "three";
import { TresCanvas } from "@tresjs/core";
import { useSettingsStore } from "../../store/settingsStore.js";
import {
  boardBackground,
  buildBoardMeshes,
  computeIsometricFrame,
  computeTopDownFrame,
  fitCameraToBoard,
  isWebglAvailable,
  SUN_POSITION,
  TILE_SIZE,
  zoomBounds,
  closeUpZoom,
  type FrustumBounds,
  type TerritoryBase,
} from "../../lib/board.js";
import type { Direction } from "../../types.js";
import type { TileKind } from "../../lib/mapEditor.js";
import CoincoinDuck from "./CoincoinDuck.vue";

const props = withDefaults(
  defineProps<{
    width: number;
    height: number;
    players?: {
      id: string;
      x: number;
      y: number;
      color: string;
      facing?: Direction;
      // Accessoire cosmétique équipé (voir lib/duckAccessories.ts). Pas encore
      // dessiné sur le canard (voir lib/coincoin.ts).
      accessory?: string;
      // Millisecondes d'intouchabilité restantes (voir back/src/game-engine/
      // game.ts) : fait clignoter le canard concerné.
      immuneForMs?: number;
      // Position de la base du joueur : sert à teinter le sol alentour
      // (voir applyTerritoryTint). Absent -> pas de territoire affiché.
      spawnX?: number;
      spawnY?: number;
    }[];
    // "isometric" pour une partie en cours (rendu), "topDown" pour l'éditeur
    // (placement précis des éléments, voir docs/04-editeur-cartes.md).
    mode?: "isometric" | "topDown";
    // Données réelles de l'éditeur (mur/spawn/vide par case). Sans ça, damier
    // par défaut (cas de l'aperçu pendant une partie en cours).
    tiles?: { x: number; y: number; kind: TileKind }[];
    // Active le clic pour poser un élément (éditeur uniquement).
    editable?: boolean;
    // Gros plan : la caméra se rapproche du joueur `followId` et le suit.
    closeUp?: boolean;
    followId?: string;
    // Case à rejoindre, mise en évidence (camp d'entraînement).
    marker?: { x: number; y: number };
  }>(),
  { mode: "isometric", editable: false, closeUp: false },
);

// Un tracé : la case où le doigt (ou la souris) se pose, puis chaque nouvelle
// case survolée tant qu'il reste appuyé.
const emit = defineEmits<{
  tileDown: [x: number, y: number];
  tileDrag: [x: number, y: number];
  // Où se trouve à l'écran le joueur suivi, en proportions du plateau affiché.
  followMoved: [point: { x: number; y: number }];
}>();

const settings = useSettingsStore();

const territoryBases = computed<TerritoryBase[]>(
  () =>
    props.players
      ?.filter(
        (p): p is typeof p & { spawnX: number; spawnY: number } =>
          Number.isFinite(p.spawnX) && Number.isFinite(p.spawnY),
      )
      .map((p) => ({ x: p.spawnX, y: p.spawnY, color: p.color })) ?? [],
);

// La lecture de la carte vit dans board.ts, partagée avec les vignettes de
// « Mes cartes » (voir lib/mapThumbnail.ts) : une vignette qui ne montre pas
// exactement le plateau qu'on va jouer ne sert à rien.
const renderTiles = computed(() =>
  buildBoardMeshes({
    width: props.width,
    height: props.height,
    tiles: props.tiles,
    bases: territoryBases.value,
  }),
);

// Certains navigateurs/webviews ne peuvent créer aucun contexte WebGL : on le
// vérifie avant de monter TresCanvas pour éviter un crash silencieux (voir
// isWebglAvailable dans lib/board.ts).
const webglAvailable = ref(true);
onMounted(() => {
  webglAvailable.value = isWebglAvailable();
});

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

  camera.near = 0.1;
  camera.far = 1000;
  camera.up.set(...frame.up);
  camera.position.set(...frame.position);
  camera.lookAt(...frame.target);
  fitCameraToBoard(camera, props.width, props.height, containerAspect.value);
  fullFrame = { left: camera.left, right: camera.right, top: camera.top, bottom: camera.bottom };
  shownFocus = undefined;
  applyZoom(1);
}

let fullFrame: FrustumBounds = { left: -1, right: 1, top: 1, bottom: -1 };
let shownFocus: { x: number; y: number } | undefined;

// Le zoom affiché rejoint celui demandé en douceur : le rapprochement se voit.
let shownZoom = 1;

/** `ease` vaut 1 pour se placer d'un coup, moins pour rejoindre le canard en douceur. */
function applyZoom(ease: number) {
  const wanted = props.closeUp ? closeUpZoom(fullFrame) : 1;
  shownZoom += (wanted - shownZoom) * ease;
  if (Math.abs(wanted - shownZoom) < 0.005) shownZoom = wanted;
  const player = props.players?.find((p) => p.id === props.followId);
  if (shownZoom <= 1 || !player) {
    Object.assign(camera, fullFrame);
    camera.updateProjectionMatrix();
    return;
  }
  camera.updateMatrixWorld();
  const goal = new Vector3(player.x + 0.5, 0.4, player.y + 0.5).applyMatrix4(
    camera.matrixWorldInverse,
  );
  shownFocus = shownFocus
    ? {
        x: shownFocus.x + (goal.x - shownFocus.x) * ease,
        y: shownFocus.y + (goal.y - shownFocus.y) * ease,
      }
    : { x: goal.x, y: goal.y };
  Object.assign(camera, zoomBounds(fullFrame, shownZoom, shownFocus));
  camera.updateProjectionMatrix();
}

let followFrame: number | undefined;
let reported = { x: -1, y: -1 };
function reportFollowed() {
  const player = props.players?.find((p) => p.id === props.followId);
  if (!player) return;
  camera.updateMatrixWorld();
  const point = new Vector3(player.x + 0.5, 0.4, player.y + 0.5).project(camera);
  const next = { x: (point.x + 1) / 2, y: (1 - point.y) / 2 };
  if (Math.abs(next.x - reported.x) + Math.abs(next.y - reported.y) < 0.004) return;
  reported = next;
  emit("followMoved", next);
}

function follow() {
  if (props.closeUp || shownZoom > 1) applyZoom(settings.reducedMotion ? 1 : 0.08);
  reportFollowed();
  followFrame = requestAnimationFrame(follow);
}
onMounted(follow);
onUnmounted(() => {
  if (followFrame !== undefined) cancelAnimationFrame(followFrame);
});

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
watch([() => props.width, () => props.height, () => props.mode], updateCamera, {
  immediate: true,
});

// Clic -> case du plateau, via un rayon caméra/souris intersecté avec le sol
// (robuste quel que soit l'angle/type de caméra, contrairement à un calcul
// manuel à partir du frustum).
const raycaster = new Raycaster();
const groundPlane = new Plane(new Vector3(0, 1, 0), 0);

function tileAt(event: PointerEvent): { x: number; y: number } | undefined {
  if (!containerRef.value) return;

  const rect = containerRef.value.getBoundingClientRect();
  const ndc = new Vector2(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1,
  );
  raycaster.setFromCamera(ndc, camera);

  const point = new Vector3();
  if (!raycaster.ray.intersectPlane(groundPlane, point)) return;

  return { x: Math.floor(point.x), y: Math.floor(point.z) };
}

let stroke: { pointerId: number; x: number; y: number } | undefined;

function startStroke(event: PointerEvent) {
  if (!props.editable || stroke || event.button !== 0) return;
  const tile = tileAt(event);
  if (!tile) return;
  // Le tracé continue même si le doigt déborde du plateau puis y revient.
  containerRef.value?.setPointerCapture?.(event.pointerId);
  stroke = { pointerId: event.pointerId, ...tile };
  emit("tileDown", tile.x, tile.y);
}

function continueStroke(event: PointerEvent) {
  if (!stroke || event.pointerId !== stroke.pointerId) return;
  const tile = tileAt(event);
  if (!tile || (tile.x === stroke.x && tile.y === stroke.y)) return;
  stroke = { pointerId: stroke.pointerId, ...tile };
  emit("tileDrag", tile.x, tile.y);
}

function endStroke(event: PointerEvent) {
  if (event.pointerId === stroke?.pointerId) stroke = undefined;
}
</script>

<template>
  <!-- touch-none : sur l'éditeur, glisser le doigt dessine au lieu de faire défiler. -->
  <div
    ref="containerRef"
    class="h-full w-full"
    :class="editable ? 'touch-none select-none' : ''"
    @pointerdown="startStroke"
    @pointermove="continueStroke"
    @pointerup="endStroke"
    @pointercancel="endStroke"
  >
    <TresCanvas v-if="webglAvailable" :camera="camera" :clear-color="boardBackground()">
      <!-- Une ambiante trop forte aplatit tout (chaque face reçoit la même
           lumière peu importe son orientation) : baissée au profit d'une
           directionnelle plus marquée. C'est le contraste entre les faces d'un
           bloc qui donne le volume, pas une ombre portée : le soleil est dans
           l'axe de la caméra, donc toute ombre tomberait derrière son objet et
           resterait invisible (voir lib/board.ts#SUN_POSITION). La passe
           d'ombre a donc été retirée — elle tournait à chaque image sans que
           rien ne puisse la projeter. -->
      <TresAmbientLight :intensity="0.35" />
      <TresDirectionalLight :position="SUN_POSITION" :intensity="1.3" />

      <TresMesh
        v-for="tile in renderTiles"
        :key="`${tile.x}-${tile.y}`"
        :position="[tile.x + 0.5, tile.centerY, tile.y + 0.5]"
      >
        <TresBoxGeometry :args="[TILE_SIZE, tile.height, TILE_SIZE]" />
        <TresMeshStandardMaterial :color="tile.color" />
      </TresMesh>

      <template v-if="props.marker">
        <TresMesh
          :position="[props.marker.x + 0.5, 0.03, props.marker.y + 0.5]"
          :rotation="[-Math.PI / 2, 0, 0]"
        >
          <TresRingGeometry :args="[0.28, 0.44, 4, 1, Math.PI / 4]" />
          <TresMeshBasicMaterial color="#fde047" />
        </TresMesh>
        <TresMesh
          :position="[props.marker.x + 0.5, 1.9, props.marker.y + 0.5]"
          :rotation="[Math.PI, 0, 0]"
        >
          <TresConeGeometry :args="[0.26, 0.5, 4]" />
          <TresMeshBasicMaterial color="#fde047" />
        </TresMesh>
      </template>

      <CoincoinDuck
        v-for="player in props.players ?? []"
        :key="player.id"
        :x="player.x"
        :y="player.y"
        :facing="player.facing"
        :color="player.color"
        :immune-for-ms="player.immuneForMs ?? 0"
      />
    </TresCanvas>

    <div v-else class="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
      <p class="text-sm text-ink/60">
        Le rendu 3D n'est pas disponible dans ce navigateur (WebGL désactivé ou non supporté).
      </p>
      <p class="text-xs text-ink/40">
        Essaie d'ouvrir la page dans un navigateur avec l'accélération matérielle activée.
      </p>
    </div>
  </div>
</template>

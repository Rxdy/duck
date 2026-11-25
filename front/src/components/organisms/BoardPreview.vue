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
  directionFacing,
  isWebglAvailable,
  SUN_POSITION,
  TILE_SIZE,
  type Facing,
  type TerritoryBase,
} from "../../lib/board.js";
import type { TileKind } from "../../lib/mapEditor.js";
import DuckSprite from "./DuckSprite.vue";

const props = withDefaults(
  defineProps<{
    width: number;
    height: number;
    players?: {
      id: string;
      x: number;
      y: number;
      color: string;
      // Accessoire cosmétique équipé (voir lib/duckAccessories.ts). Pas encore
      // dessiné sur le canard : les sprites (voir DuckSprite.vue) n'en ont pas
      // de version, il faudra une image d'accessoire par direction.
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
    // Serre ou desserre le cadrage isométrique (voir board.ts#computeIsometricFrame).
    // Par défaut : la marge confortable d'une partie en cours.
    fit?: number;
  }>(),
  { mode: "isometric", editable: false },
);

const emit = defineEmits<{ tileClick: [x: number, y: number] }>();

// Le plateau suit le thème de l'interface : un rectangle noir au milieu d'un
// écran clair se lit comme une image qui n'a pas chargé.
const settings = useSettingsStore();
const boardTheme = computed(() => settings.theme);

// Hauteur du sprite du canard (voir DuckSprite.vue), un peu plus d'une case :
// en dessous, le personnage se lit comme un simple pion posé sur le plateau.
const DUCK_HEIGHT = 1.05;

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
    theme: boardTheme.value,
    bases: territoryBases.value,
  }),
);

// Direction actuellement affichée par chaque canard (voir DuckSprite.vue) :
// comparée à la position précédente à chaque mise à jour, pour ne changer
// de pose que sur un vrai déplacement et garder la dernière direction le
// reste du temps (immobile ne doit pas remettre le canard face "bas" par
// défaut).
const facingByPlayerId = ref(new Map<string, Facing>());
const lastPositionByPlayerId = new Map<string, { x: number; y: number }>();
watch(
  () => props.players,
  (players) => {
    for (const p of players ?? []) {
      const last = lastPositionByPlayerId.get(p.id);
      if (!last) {
        // Premier affichage : "se" par défaut, une pose de face plutôt que de
        // dos — on veut voir le canard au moment où il apparaît.
        facingByPlayerId.value.set(p.id, "se");
      } else if (last.x !== p.x || last.y !== p.y) {
        const facing = directionFacing(p.x - last.x, p.y - last.y);
        if (facing) facingByPlayerId.value.set(p.id, facing);
      }
      lastPositionByPlayerId.set(p.id, { x: p.x, y: p.y });
    }
  },
  { deep: true, immediate: true },
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

/**
 * Format de conteneur pour lequel les cadrages de board.ts sont calibrés. En
 * dessous (conteneur plus haut que large : téléphone en portrait, aperçu en
 * colonne), la caméra orthographique ne montre QUE `viewSize * aspect` en
 * largeur — le plateau, plus large que haut à l'écran, se retrouve coupé sur
 * les côtés. On élargit alors la vue d'autant.
 *
 * Valeurs empiriques, vérifiées à l'écran. Le cadrage exact consisterait à
 * projeter les quatre coins du plateau dans le repère caméra et à ajuster au
 * plus juste : plus rien à calibrer, et plus de marge perdue en portrait —
 * mais ça touche des fonctions de board.ts utilisées partout, à faire à
 * froid plutôt qu'en passant.
 */
const CALIBRATED_ASPECT = { isometric: 1.4, topDown: 1 } as const;

function updateCamera() {
  const frame =
    props.mode === "topDown"
      ? computeTopDownFrame(props.width, props.height)
      : computeIsometricFrame(props.width, props.height, props.fit);

  const aspect = containerAspect.value;
  const viewSize = frame.viewSize * Math.max(1, CALIBRATED_ASPECT[props.mode] / aspect);

  camera.left = -viewSize * aspect;
  camera.right = viewSize * aspect;
  camera.top = viewSize;
  camera.bottom = -viewSize;
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
watch([() => props.width, () => props.height, () => props.mode, () => props.fit], updateCamera, {
  immediate: true,
});

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
    <TresCanvas v-if="webglAvailable" :camera="camera" :clear-color="boardBackground(boardTheme)">
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

      <TresGroup
        v-for="player in props.players ?? []"
        :key="player.id"
        :position="[player.x + 0.5, DUCK_HEIGHT / 2, player.y + 0.5]"
      >
        <DuckSprite
          :color="player.color"
          :size="DUCK_HEIGHT"
          :facing="facingByPlayerId.get(player.id) ?? 'se'"
          :immune-for-ms="player.immuneForMs ?? 0"
        />
      </TresGroup>
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

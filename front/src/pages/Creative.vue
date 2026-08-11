<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { BOARD_PRESETS, CUSTOM_SIZE_ID } from "../lib/board.js";
import {
  countSpawns,
  isBorder,
  placeTile,
  playableLabel,
  toPlacedTiles,
} from "../lib/mapEditor.js";
import { parseMatrixText, toMatrixText } from "../lib/mapMatrix.js";
import { fetchMyMaps, saveMyMap } from "../lib/mapsApi.js";
import { useAuthStore } from "../store/authStore.js";
import { useCreativeEditorStore } from "../store/creativeEditorStore.js";
import { useTestSessionStore } from "../store/testSessionStore.js";
import AppButton from "../components/atoms/AppButton.vue";
import IconButton from "../components/atoms/IconButton.vue";
import BoardSizeDropdown from "../components/molecules/BoardSizeDropdown.vue";
import BoardViewDialog from "../components/molecules/BoardViewDialog.vue";
import MatrixDialog from "../components/molecules/MatrixDialog.vue";
import ElementPicker from "../components/molecules/ElementPicker.vue";
import BoardPreview from "../components/organisms/BoardPreview.vue";

const route = useRoute();
const router = useRouter();
const testSession = useTestSessionStore();
const editor = useCreativeEditorStore();
const auth = useAuthStore();

const spawnCount = computed(() => countSpawns(editor.map));
const placedTiles = computed(() => toPlacedTiles(editor.map));

// Les tailles manipulées par le sélecteur sont la zone jouable ; la carte,
// elle, porte ses murs de contour en plus (voir mapEditor.ts#createEmptyMap).
const playableWidth = computed(() => editor.map.width - 2);
const playableHeight = computed(() => editor.map.height - 2);

// Choix dans la liste : un preset repart d'une carte vide à sa taille, "sur
// mesure" ne fait qu'ouvrir les champs de saisie (la carte en cours n'a
// aucune raison d'être détruite tant qu'aucune taille n'a été saisie).
function handleSelect(id: string) {
  if (id === CUSTOM_SIZE_ID) {
    editor.selectCustomSize();
    return;
  }
  const preset = BOARD_PRESETS.find((p) => p.id === id);
  if (preset) editor.resetForSize(preset.width, preset.height, preset.id);
}

function handleResize(width: number, height: number) {
  editor.resetForSize(width, height, CUSTOM_SIZE_ID);
}

function handleTileClick(x: number, y: number) {
  editor.map = placeTile(editor.map, x, y, editor.tool);
}

const notice = ref<string | null>(null);
function notify(message: string) {
  notice.value = message;
}

function handleTest() {
  testSession.setMap(editor.map);
  router.push("/creatif/test");
}

// Repart d'une carte vide à la taille actuellement sélectionnée : détache
// aussi de la carte sauvegardée en cours (currentMapId/mapName), sinon un
// "Sauvegarder" après reset écraserait l'ancienne carte avec du vide.
function handleReset() {
  editor.resetForSize(playableWidth.value, playableHeight.value, editor.selectedId);
  notify("Carte réinitialisée.");
}

// Matrice texte (voir lib/mapMatrix.ts) : point de sauvegarde à coller dans
// un fichier, et porte d'entrée pour une carte écrite ailleurs.
const matrixMode = ref<"export" | "import" | null>(null);
const matrixError = ref<string | undefined>();
const matrixText = computed(() => toMatrixText(editor.map));

// Une carte vierge n'a que ses murs de contour : tout le reste signifie qu'un
// import détruirait un vrai travail, et mérite d'être annoncé.
const hasWork = computed(() =>
  editor.map.tiles.some((row, y) =>
    row.some((kind, x) => kind !== "empty" && !isBorder(editor.map.width, editor.map.height, x, y)),
  ),
);

// Un bouton qui ne peut rien faire ne doit pas inviter à être cliqué : il
// est désactivé, plutôt que de répondre par un message d'erreur.
const isPlayable = computed(() => spawnCount.value >= 2);
const hasName = computed(() => editor.mapName.trim().length > 0);

// Aperçu isométrique (voir molecules/BoardViewDialog.vue) : l'éditeur travaille
// de dessus, on ne voit jamais le plateau comme le joueur le verra.
const viewing = ref(false);

function openMatrix(mode: "export" | "import") {
  matrixError.value = undefined;
  matrixMode.value = mode;
}

function handleMatrixImport(text: string) {
  const result = parseMatrixText(text);
  if (!result.ok) {
    matrixError.value = result.error;
    return;
  }

  editor.importMap(result.map);
  matrixMode.value = null;
  notify(["Grille importée.", ...result.warnings].join(" "));
}

// Sauvegarde sur le compte (voir back/src/maps.ts) : c'est la base qui fait
// foi, pour qu'une carte survive à un vidage de cache et se retrouve depuis
// n'importe quel appareil. Sans compte, il n'y a pas de propriétaire à qui
// la rattacher — on le dit plutôt que de laisser croire à une sauvegarde.
async function handleSave() {
  if (!auth.session) {
    notify("Connecte-toi pour sauvegarder tes cartes.");
    return;
  }

  const saved = await saveMyMap(auth.session.token, {
    id: editor.currentMapId,
    name: editor.mapName,
    map: editor.map,
  });
  if (!saved) {
    notify("Sauvegarde impossible : serveur injoignable ou carte refusée.");
    return;
  }

  editor.currentMapId = saved.id;
  editor.mapName = saved.name;
  notify(`Carte "${saved.name}" sauvegardée.`);
}

async function loadMapById(id: string) {
  if (!auth.session) return;
  const found = (await fetchMyMaps(auth.session.token)).find((m) => m.id === id);
  if (!found) return;
  editor.loadMap(found);
  notify(`Carte "${found.name}" chargée.`);
}

// Revenu de /creatif/cartes avec une carte à charger (?load=<uuid>).
onMounted(() => {
  const loadId = route.query.load;
  if (typeof loadId === "string") {
    void loadMapById(loadId);
    router.replace({ path: "/creatif" });
  }
});
</script>

<template>
  <div class="flex h-full flex-col gap-3 overflow-y-auto px-4 py-6">
    <div class="flex items-start justify-between gap-2">
      <div>
        <h1 class="text-2xl font-bold">Créatif</h1>
        <p class="text-sm text-ink/60">Place les spawns (2 à 4) et les murs, puis sauvegarde.</p>
      </div>
      <RouterLink
        to="/creatif/cartes"
        class="shrink-0 rounded-lg bg-ink/10 px-3 py-2 text-xs font-semibold text-ink/70"
      >
        Mes cartes
      </RouterLink>
    </div>

    <BoardSizeDropdown
      :model-value="editor.selectedId"
      :playable-width="playableWidth"
      :playable-height="playableHeight"
      @select="handleSelect"
      @resize="handleResize"
    />

    <div class="flex items-center justify-between gap-2">
      <ElementPicker :model-value="editor.tool" @update:model-value="editor.tool = $event" />
      <p class="shrink-0 text-right text-xs text-ink/50">
        Spawns {{ spawnCount }}/4<br />
        {{ playableLabel(spawnCount) }}
      </p>
    </div>

    <div class="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-ink/10 bg-surface">
      <BoardPreview
        :width="editor.map.width"
        :height="editor.map.height"
        :tiles="placedTiles"
        mode="topDown"
        editable
        @tile-click="handleTileClick"
      />

      <!-- Outils de la carte posés SUR le plateau : ils agissent sur ce qu'on
           regarde, et le bas de l'écran ne garde que ce qui conclut le travail
           (nommer, tester, sauvegarder). -->
      <div class="absolute right-2 top-2 flex flex-col gap-2">
        <IconButton
          icon="ri-eye-line"
          label="Visualiser en 3D"
          :disabled="!hasWork"
          @click="viewing = true"
        />
        <IconButton
          icon="ri-file-copy-line"
          label="Extraire la grille"
          :disabled="!hasWork"
          @click="openMatrix('export')"
        />
        <IconButton
          icon="ri-clipboard-line"
          label="Importer une grille"
          @click="openMatrix('import')"
        />
        <IconButton
          icon="ri-refresh-line"
          label="Réinitialiser la carte"
          :disabled="!hasWork"
          @click="handleReset"
        />
      </div>
    </div>

    <input
      v-model="editor.mapName"
      type="text"
      placeholder="Nom de la carte"
      class="rounded-lg border border-ink/10 bg-ink/10 px-3 py-2 text-sm text-ink placeholder:text-ink/40"
    />

    <div class="flex gap-2">
      <AppButton class="flex-1" :disabled="!isPlayable" @click="handleTest">Tester</AppButton>
      <AppButton class="flex-1" :disabled="!hasName" @click="handleSave">Sauvegarder</AppButton>
    </div>
    <p v-if="notice" class="text-center text-xs text-amber-400">{{ notice }}</p>

    <BoardViewDialog
      v-if="viewing"
      :width="editor.map.width"
      :height="editor.map.height"
      :tiles="placedTiles"
      @close="viewing = false"
    />

    <MatrixDialog
      v-if="matrixMode"
      :mode="matrixMode"
      :matrix="matrixText"
      :has-work="hasWork"
      :error="matrixError"
      @close="matrixMode = null"
      @import="handleMatrixImport"
    />
  </div>
</template>

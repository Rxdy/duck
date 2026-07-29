<script setup lang="ts">
import { computed } from "vue";
import { toAccessoryKind } from "../../lib/duckAccessories.js";
import { mixHexColors } from "../../lib/board.js";

/**
 * Canard composé de primitives Three.js (corps, tête, bec, yeux, pattes)
 * plutôt qu'un vrai modèle 3D importé — pas de pipeline d'assets/modélisation
 * dans ce projet pour l'instant. `color` distingue les joueurs en partie
 * (voir back/src/shared.ts#PLAYER_COLORS), `accessory` est le skin
 * cosmétique du compte (voir lib/duckAccessories.ts) : un chapeau, pas une
 * couleur. Fait toujours face à +Z localement ; c'est à l'appelant
 * (BoardPreview.vue) de faire pivoter le groupe parent selon la direction de
 * déplacement.
 *
 * `roughness`/`metalness` bas (au lieu des valeurs par défaut de
 * MeshStandardMaterial, entièrement mates) : sans un minimum de reflet
 * spéculaire, une forme arrondie ne se distingue quasiment pas d'une forme
 * plate sous un éclairage doux — c'est ce reflet qui dessine la courbure.
 */
const props = withDefaults(
  defineProps<{
    color: string;
    size?: number;
    accessory?: string;
  }>(),
  { size: 0.8, accessory: "none" },
);

const accessory = computed(() => toAccessoryKind(props.accessory));
// Ailes légèrement plus sombres que le corps : sans ça, une aile de la même
// couleur unie que le corps ne se distingue quasiment pas de lui (seul le
// relief de l'éclairage la sépare), et la silhouette relit comme un simple
// œuf plutôt qu'un oiseau.
const wingColor = computed(() => mixHexColors(props.color, "#000000", 0.35));

const BEAK_COLOR = "#FF9F1C";
const EYE_COLOR = "#1A1A1A";

const BODY_MATERIAL = { roughness: 0.5, metalness: 0.08 };
const BEAK_MATERIAL = { roughness: 0.35, metalness: 0.05 };
const EYE_MATERIAL = { roughness: 0.15, metalness: 0.2 };
const FABRIC_MATERIAL = { roughness: 0.7, metalness: 0 };
const GOLD_MATERIAL = { roughness: 0.3, metalness: 0.8 };
</script>

<template>
  <TresGroup>
    <!-- Corps -->
    <TresMesh
      :position="[0, -size * 0.08, -size * 0.05]"
      :scale="[size * 0.4, size * 0.27, size * 0.5]"
      cast-shadow
      receive-shadow
    >
      <TresSphereGeometry :args="[1, 20, 16]" />
      <TresMeshStandardMaterial :color="color" v-bind="BODY_MATERIAL" />
    </TresMesh>

    <!-- Ailes : accolées sur les côtés du corps, légèrement vers l'arrière. -->
    <TresMesh
      :position="[size * 0.36, -size * 0.08, -size * 0.13]"
      :scale="[size * 0.08, size * 0.2, size * 0.16]"
      cast-shadow
    >
      <TresSphereGeometry :args="[1, 12, 10]" />
      <TresMeshStandardMaterial :color="wingColor" v-bind="BODY_MATERIAL" />
    </TresMesh>
    <TresMesh
      :position="[-size * 0.36, -size * 0.08, -size * 0.13]"
      :scale="[size * 0.08, size * 0.2, size * 0.16]"
      cast-shadow
    >
      <TresSphereGeometry :args="[1, 12, 10]" />
      <TresMeshStandardMaterial :color="wingColor" v-bind="BODY_MATERIAL" />
    </TresMesh>

    <!-- Tête -->
    <TresMesh
      :position="[0, size * 0.22, size * 0.28]"
      :scale="[size * 0.24, size * 0.22, size * 0.24]"
      cast-shadow
      receive-shadow
    >
      <TresSphereGeometry :args="[1, 20, 16]" />
      <TresMeshStandardMaterial :color="color" v-bind="BODY_MATERIAL" />
    </TresMesh>

    <!-- Bec : part de la surface de la tête (~0.52*size) et dépasse nettement devant. -->
    <TresMesh
      :position="[0, size * 0.19, size * 0.6]"
      :rotation="[Math.PI / 2, 0, 0]"
      :scale="[size * 0.1, size * 0.1, size * 0.2]"
      cast-shadow
    >
      <TresConeGeometry :args="[1, 1, 12]" />
      <TresMeshStandardMaterial :color="BEAK_COLOR" v-bind="BEAK_MATERIAL" />
    </TresMesh>

    <!-- Yeux : légèrement au-delà de la surface de la tête pour rester visibles. -->
    <TresMesh
      :position="[size * 0.15, size * 0.28, size * 0.48]"
      :scale="[size * 0.045, size * 0.045, size * 0.045]"
    >
      <TresSphereGeometry :args="[1, 10, 10]" />
      <TresMeshStandardMaterial :color="EYE_COLOR" v-bind="EYE_MATERIAL" />
    </TresMesh>
    <TresMesh
      :position="[-size * 0.15, size * 0.28, size * 0.48]"
      :scale="[size * 0.045, size * 0.045, size * 0.045]"
    >
      <TresSphereGeometry :args="[1, 10, 10]" />
      <TresMeshStandardMaterial :color="EYE_COLOR" v-bind="EYE_MATERIAL" />
    </TresMesh>

    <!-- Pattes : décalées vers l'avant et un peu écartées pour ne pas rester
         cachées sous le corps vu d'en haut (voir aussi le corps aplati
         ci-dessus, qui libère de la hauteur pour qu'elles se voient). -->
    <TresMesh
      :position="[size * 0.15, -size * 0.4, size * 0.12]"
      :scale="[size * 0.035, size * 0.16, size * 0.035]"
      cast-shadow
    >
      <TresCylinderGeometry :args="[1, 1, 1, 10]" />
      <TresMeshStandardMaterial :color="BEAK_COLOR" v-bind="BEAK_MATERIAL" />
    </TresMesh>
    <TresMesh
      :position="[-size * 0.15, -size * 0.4, size * 0.12]"
      :scale="[size * 0.035, size * 0.16, size * 0.035]"
      cast-shadow
    >
      <TresCylinderGeometry :args="[1, 1, 1, 10]" />
      <TresMeshStandardMaterial :color="BEAK_COLOR" v-bind="BEAK_MATERIAL" />
    </TresMesh>

    <!-- Pieds : petites palmes plates au sol. -->
    <TresMesh
      :position="[size * 0.15, -size * 0.49, size * 0.19]"
      :scale="[size * 0.08, size * 0.02, size * 0.12]"
      cast-shadow
    >
      <TresBoxGeometry :args="[1, 1, 1]" />
      <TresMeshStandardMaterial :color="BEAK_COLOR" v-bind="BEAK_MATERIAL" />
    </TresMesh>
    <TresMesh
      :position="[-size * 0.15, -size * 0.49, size * 0.19]"
      :scale="[size * 0.08, size * 0.02, size * 0.12]"
      cast-shadow
    >
      <TresBoxGeometry :args="[1, 1, 1]" />
      <TresMeshStandardMaterial :color="BEAK_COLOR" v-bind="BEAK_MATERIAL" />
    </TresMesh>

    <!-- Accessoire (skin) : posé sur la tête -->
    <TresGroup v-if="accessory === 'top-hat'" :position="[0, size * 0.4, size * 0.28]">
      <TresMesh :scale="[size * 0.2, size * 0.02, size * 0.2]" cast-shadow>
        <TresCylinderGeometry :args="[1, 1, 1, 20]" />
        <TresMeshStandardMaterial color="#111111" v-bind="FABRIC_MATERIAL" />
      </TresMesh>
      <TresMesh
        :position="[0, size * 0.1, 0]"
        :scale="[size * 0.13, size * 0.14, size * 0.13]"
        cast-shadow
      >
        <TresCylinderGeometry :args="[1, 1, 1, 20]" />
        <TresMeshStandardMaterial color="#111111" v-bind="FABRIC_MATERIAL" />
      </TresMesh>
    </TresGroup>

    <TresGroup v-else-if="accessory === 'cap'" :position="[0, size * 0.38, size * 0.28]">
      <TresMesh :scale="[size * 0.19, size * 0.13, size * 0.19]" cast-shadow>
        <TresSphereGeometry :args="[1, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2]" />
        <TresMeshStandardMaterial color="#2563EB" v-bind="FABRIC_MATERIAL" />
      </TresMesh>
      <TresMesh
        :position="[0, size * 0.0, size * 0.16]"
        :rotation="[Math.PI / 2.2, 0, 0]"
        :scale="[size * 0.13, size * 0.09, size * 0.02]"
        cast-shadow
      >
        <TresCylinderGeometry :args="[1, 1, 1, 20]" />
        <TresMeshStandardMaterial color="#1D4ED8" v-bind="FABRIC_MATERIAL" />
      </TresMesh>
    </TresGroup>

    <TresGroup v-else-if="accessory === 'crown'" :position="[0, size * 0.4, size * 0.28]">
      <TresMesh :scale="[size * 0.19, size * 0.07, size * 0.19]" cast-shadow>
        <TresCylinderGeometry :args="[1, 1, 1, 20]" />
        <TresMeshStandardMaterial color="#FFD700" v-bind="GOLD_MATERIAL" />
      </TresMesh>
      <TresMesh
        v-for="spike in 5"
        :key="spike"
        :position="[
          Math.cos((spike / 5) * Math.PI * 2) * size * 0.15,
          size * 0.12,
          Math.sin((spike / 5) * Math.PI * 2) * size * 0.15,
        ]"
        :scale="[size * 0.045, size * 0.09, size * 0.045]"
        cast-shadow
      >
        <TresConeGeometry :args="[1, 1, 8]" />
        <TresMeshStandardMaterial color="#FFD700" v-bind="GOLD_MATERIAL" />
      </TresMesh>
    </TresGroup>
  </TresGroup>
</template>

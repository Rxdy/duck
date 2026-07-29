<script setup lang="ts">
import { computed } from "vue";
import { CanvasTexture, NearestFilter, SRGBColorSpace } from "three";
import type { Facing } from "../../lib/board.js";
import { toAccessoryKind } from "../../lib/duckAccessories.js";
import { drawDuckSprite, duckSpriteAspect, type DuckView } from "../../lib/duckSprite.js";

/**
 * Canard-sprite : une image en aplats de couleur (voir duckSprite.ts)
 * plaquée sur un THREE.Sprite, qui reste toujours face à la caméra quel que
 * soit l'angle isométrique (technique "Habbo" : décor 3D, personnage en
 * image plate). 4 directions à l'écran (voir board.ts#directionFacing :
 * SE/SW/NE/NW, les diagonales isométriques réelles), mais seulement 2
 * dessins : SE/SW rapprochent TOUJOURS le joueur de la caméra (même pose
 * "qui s'approche", en miroir l'une de l'autre) et NE/NW l'en éloignent
 * TOUJOURS (même pose "de dos", déjà symétrique, jamais retournée). Le
 * déplacement se fait par téléportation case par case, donc aucune
 * animation de transition à gérer ici.
 */
const props = withDefaults(
  defineProps<{
    color: string;
    size?: number;
    accessory?: string;
    facing?: Facing;
  }>(),
  { size: 0.8, accessory: "none", facing: "se" },
);

const accessory = computed(() => toAccessoryKind(props.accessory));

const view = computed((): DuckView => (props.facing === "nw" || props.facing === "ne" ? "back" : "approach"));

// Le dessin "approach" fait face au SE par défaut : miroir horizontal pour
// SW, l'autre direction "qui s'approche". "back" est déjà symétrique,
// jamais retourné.
const mirror = computed(() => (props.facing === "sw" ? -1 : 1));

const texture = computed(() => {
  const canvas = drawDuckSprite(props.color, accessory.value, view.value);
  const tex = new CanvasTexture(canvas);
  tex.magFilter = NearestFilter;
  tex.minFilter = NearestFilter;
  tex.colorSpace = SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
});

const spriteScale = computed((): [number, number, number] => {
  return [props.size * duckSpriteAspect() * mirror.value, props.size, 1];
});
</script>

<template>
  <TresSprite :scale="spriteScale">
    <TresSpriteMaterial :map="texture" transparent :alpha-test="0.5" />
  </TresSprite>
</template>

<script setup lang="ts">
import { computed } from "vue";

/**
 * La carte entière en petit, pour se repérer quand la caméra est rapprochée.
 * Orientée comme le plateau (en losange) : « en haut à droite » y veut dire la
 * même chose.
 */
const props = defineProps<{
  width: number;
  height: number;
  tiles: { x: number; y: number; kind: string }[];
  players: { id: string; x: number; y: number; color: string }[];
  meId?: string;
}>();

// Aplatissement vertical de la vue isométrique de la caméra.
const TILT = 0.58;
const project = (x: number, y: number) => ({ x: x - y, y: (x + y) * TILT });

function diamond(x: number, y: number): string {
  return [project(x, y), project(x + 1, y), project(x + 1, y + 1), project(x, y + 1)]
    .map((p) => `${p.x},${p.y}`)
    .join(" ");
}

const viewBox = computed(
  () => `${-props.height} 0 ${props.width + props.height} ${(props.width + props.height) * TILT}`,
);
const walls = computed(() => props.tiles.filter((t) => t.kind === "wall"));
const dots = computed(() =>
  props.players.map((p) => ({ ...p, ...project(p.x + 0.5, p.y + 0.5), me: p.id === props.meId })),
);
const outline = computed(() =>
  [
    project(0, 0),
    project(props.width, 0),
    project(props.width, props.height),
    project(0, props.height),
  ]
    .map((p) => `${p.x},${p.y}`)
    .join(" "),
);
</script>

<template>
  <div
    class="panel pointer-events-none absolute bottom-2 left-2 z-10 w-32 rounded-xl p-1.5 opacity-90 sm:w-44 short:w-28 corners:bottom-20 corners:left-3"
  >
    <svg :viewBox="viewBox" role="img" aria-label="Mini-carte" class="block w-full">
      <polygon :points="outline" class="fill-surface-deep" />
      <polygon
        v-for="wall in walls"
        :key="`${wall.x}-${wall.y}`"
        :points="diamond(wall.x, wall.y)"
        class="fill-slate-500"
      />
      <circle
        v-for="dot in dots"
        :key="dot.id"
        :data-me="dot.me || undefined"
        :cx="dot.x"
        :cy="dot.y"
        :r="dot.me ? 1.1 : 0.85"
        :fill="dot.color"
        :stroke="dot.me ? 'white' : 'none'"
        stroke-width="0.4"
      />
    </svg>
  </div>
</template>

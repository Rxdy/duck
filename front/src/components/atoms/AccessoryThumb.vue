<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { queueThumbnail } from "../../lib/thumbnailQueue.js";

/**
 * L'image d'un accessoire. `locked` n'en montre que l'ombre. Elle n'est dessinée qu'en approchant de
 * l'écran : le catalogue en compte des centaines.
 */
const props = withDefaults(defineProps<{ id: string; locked?: boolean }>(), { locked: false });

const box = ref<HTMLElement>();
const source = ref<string>();
let observer: IntersectionObserver | undefined;
let seen = false;
let cancel: (() => void) | undefined;

function draw() {
  cancel?.();
  cancel = queueThumbnail(props.id, (url) => (source.value = url));
}

onMounted(() => {
  if (typeof IntersectionObserver === "undefined") return;
  observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      observer?.disconnect();
      seen = true;
      draw();
    },
    { rootMargin: "120px" },
  );
  observer.observe(box.value!);
});

watch(
  () => props.id,
  () => {
    source.value = undefined;
    if (seen) draw();
  },
);

onBeforeUnmount(() => {
  observer?.disconnect();
  cancel?.();
});
</script>

<template>
  <span ref="box" class="block h-full w-full" :data-locked="locked || undefined">
    <img
      v-if="source"
      :src="source"
      alt=""
      draggable="false"
      class="h-full w-full object-contain"
      :class="locked ? 'opacity-[0.16] brightness-0 invert' : ''"
    />
  </span>
</template>

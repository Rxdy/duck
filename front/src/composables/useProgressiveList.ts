import { computed, ref, watch, type Ref } from "vue";

/** Assez pour remplir un grand écran, assez peu pour s'afficher d'un coup sur un téléphone. */
export const PAGE_SIZE = 36;
/** À cette distance du bas (en pixels), on charge la suite avant qu'elle ne manque. */
const AHEAD = 400;

/**
 * Une longue liste affichée petit à petit : une page, puis la suivante en approchant du bas. On
 * repart du début quand `resetKey` change (autre tri, autre filtre).
 */
export function useProgressiveList<T>(items: Ref<T[]>, resetKey: () => unknown) {
  const limit = ref(PAGE_SIZE);
  const scroller = ref<HTMLElement>();

  watch(resetKey, () => {
    limit.value = PAGE_SIZE;
    if (scroller.value) scroller.value.scrollTop = 0;
  });

  const visible = computed(() => items.value.slice(0, limit.value));

  function onScroll(event: Event) {
    const el = event.target as HTMLElement;
    if (
      limit.value < items.value.length &&
      el.scrollTop + el.clientHeight >= el.scrollHeight - AHEAD
    ) {
      limit.value += PAGE_SIZE;
    }
  }

  return { visible, scroller, onScroll };
}

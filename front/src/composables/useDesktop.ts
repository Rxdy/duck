import { onMounted, onUnmounted, ref } from "vue";

/** Un grand écran utilisé à la souris. Une tablette ou un téléphone, même couché, n'en est pas un. */
const DESKTOP = "(min-width: 1024px) and (pointer: fine)";

export function useDesktop() {
  const query = typeof window.matchMedia === "function" ? window.matchMedia(DESKTOP) : null;
  const isDesktop = ref(query?.matches ?? false);
  const update = (event: MediaQueryListEvent) => (isDesktop.value = event.matches);
  onMounted(() => query?.addEventListener("change", update));
  onUnmounted(() => query?.removeEventListener("change", update));
  return isDesktop;
}

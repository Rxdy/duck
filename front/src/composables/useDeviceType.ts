import { onMounted, onUnmounted, ref } from "vue";

function getCoarsePointerQuery(): MediaQueryList | null {
  try {
    return window.matchMedia("(pointer: coarse)");
  } catch {
    return null;
  }
}

/**
 * Détecte un appareil à pointeur "grossier" (tactile) plutôt que de sniffer
 * l'OS/le user-agent : ça capture aussi bien un mobile qu'une tablette ou un
 * laptop tactile, et reflète le pointeur réellement utilisé plutôt qu'une
 * simple présomption basée sur la plateforme. `matchMedia` n'existe pas en
 * environnement de test (jsdom) : on retombe alors sur `false`.
 */
export function useDeviceType() {
  const query = getCoarsePointerQuery();
  const isTouchDevice = ref(query?.matches ?? false);

  function update(event: MediaQueryListEvent) {
    isTouchDevice.value = event.matches;
  }

  onMounted(() => query?.addEventListener("change", update));
  onUnmounted(() => query?.removeEventListener("change", update));

  return { isTouchDevice };
}

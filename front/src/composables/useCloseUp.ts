import { onScopeDispose, ref, watch } from "vue";

/** Temps de découverte de la carte entière avant de se rapprocher. */
export const OVERVIEW_MS = 900;
/** Durée du rapprochement : avec la découverte, il s'achève avec le décompte de 3 secondes. */
export const ZOOM_MS = 2000;

/**
 * Au départ on montre la carte entière, puis la caméra passe en gros plan sur le
 * canard et y reste : le même cadrage pour tous, sans réglage.
 */
export function useCloseUp(ready: () => boolean = () => true) {
  const closeUp = ref(false);
  let timer: ReturnType<typeof setTimeout> | undefined;

  watch(
    ready,
    (isReady) => {
      clearTimeout(timer);
      closeUp.value = false;
      if (isReady) timer = setTimeout(() => (closeUp.value = true), OVERVIEW_MS);
    },
    { immediate: true },
  );
  onScopeDispose(() => clearTimeout(timer));

  return closeUp;
}

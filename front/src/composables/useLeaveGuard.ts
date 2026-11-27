import { onBeforeUnmount, onMounted, ref } from "vue";
import { onBeforeRouteLeave } from "vue-router";

/**
 * Demande confirmation avant de quitter une page qui a du travail non enregistré : changement de
 * page dans le jeu (fenêtre à nous : `asking`, puis `decide`) et fermeture ou rechargement de
 * l'onglet (message du navigateur). Rien ne s'affiche tant que `dirty()` est faux.
 */
export function useLeaveGuard(dirty: () => boolean) {
  const asking = ref(false);
  let answer: ((leave: boolean) => void) | undefined;

  onBeforeRouteLeave(() => {
    if (!dirty()) return true;
    answer?.(false);
    asking.value = true;
    return new Promise<boolean>((resolve) => (answer = resolve));
  });

  function decide(leave: boolean) {
    asking.value = false;
    answer?.(leave);
    answer = undefined;
  }

  function warn(event: BeforeUnloadEvent) {
    if (!dirty()) return;
    event.preventDefault();
    event.returnValue = "";
  }
  onMounted(() => window.addEventListener("beforeunload", warn));
  onBeforeUnmount(() => window.removeEventListener("beforeunload", warn));

  return { asking, decide };
}

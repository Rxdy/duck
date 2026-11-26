import { ref, watch } from "vue";
import { accessoryName } from "../lib/wardrobe.js";
import { claimTutorialGift } from "../lib/wardrobeApi.js";
import { useAuthStore } from "../store/authStore.js";
import { tutorialDone } from "./useTutorial.js";

/**
 * Le cadeau de fin de tutoriel : réclamé dès que le tutoriel est terminé ET qu'un compte est
 * ouvert, dans un ordre comme dans l'autre (un invité le reçoit donc à son inscription). Le serveur
 * ne le donne qu'une fois : le redemander est sans effet.
 */
export function useTutorialGift(finished: () => boolean = tutorialDone) {
  const auth = useAuthStore();
  /** Nom de l'accessoire qui vient d'être gagné. */
  const won = ref<string>();

  watch(
    [() => auth.session?.token, finished],
    async ([token, done]) => {
      if (!token || !done) return;
      const item = await claimTutorialGift(token);
      if (item) won.value = accessoryName(item);
    },
    { immediate: true },
  );

  return won;
}

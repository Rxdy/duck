import { onMounted, onUnmounted } from "vue";
import type { Direction } from "../types.js";
import { directionForKey } from "../lib/keyboard.js";
import { useSettingsStore } from "../store/settingsStore.js";

/**
 * Déplacement au clavier pendant une partie. L'écoute reste active quel que
 * soit l'appareil détecté (voir useDeviceType) : celui-ci ne pilote que
 * l'affichage des réglages dans Options, pas la capacité réelle à brancher un
 * clavier (ex: tablette avec clavier Bluetooth).
 */
export function useKeyboardControls(move: (direction: Direction) => void) {
  const settings = useSettingsStore();

  function handleKeydown(event: KeyboardEvent) {
    // Une touche MAINTENUE déclenche l'auto-repeat du système (~25-30
    // keydown/s), soit bien plus qu'un joueur qui martèle la touche (~10-14/s).
    // Sans ce filtre, ne rien faire battrait le fait de jouer vite : or c'est
    // exactement l'inverse qu'on veut récompenser (voir
    // docs/02-gameplay.md#rythme-de-déplacement). Une touche maintenue vaut
    // donc un seul déplacement, il faut relâcher pour en refaire un.
    if (event.repeat) return;

    const direction = directionForKey(event.code, settings.keyBindings);
    if (direction) move(direction);
  }

  onMounted(() => window.addEventListener("keydown", handleKeydown));
  onUnmounted(() => window.removeEventListener("keydown", handleKeydown));
}

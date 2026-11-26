import type { Direction } from "../types.js";
import { GLIDE_MS } from "./coincoin.js";

/**
 * Le rythme des modes joués dans le navigateur (tutoriel, mode libre), identique à celui du serveur
 * (back/src/room.ts) : un pas à la fois, le temps d'une glissade entière. Un appui pendant la
 * glissade est gardé et part dès qu'elle finit ; seul le dernier compte.
 */
export function createStepPacer(run: (direction: Direction) => void, stepMs = GLIDE_MS) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let next: Direction | undefined;

  function step(direction: Direction) {
    // Armé avant d'exécuter : le pas peut lui-même vider la file (étape réussie).
    timer = setTimeout(() => {
      timer = undefined;
      const queued = next;
      next = undefined;
      if (queued) step(queued);
    }, stepMs);
    run(direction);
  }

  return {
    push(direction: Direction) {
      if (timer === undefined) step(direction);
      else next = direction;
    },
    /** Oublie le pas en attente (retour à la base, changement d'écran). */
    clear() {
      next = undefined;
    },
  };
}

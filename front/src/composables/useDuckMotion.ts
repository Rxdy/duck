import { easeInOut, GLIDE_MS, headingFor, shouldGlide, turnTowards } from "../lib/coincoin.js";

/** Au départ le bec est tourné vers +x, visible de face par la caméra isométrique. */
const INITIAL_HEADING = Math.PI / 2;

export interface Pose {
  x: number;
  y: number;
  heading: number;
}

/**
 * Mouvement d'un canard entre les cases. Le serveur reste seul juge de la case
 * occupée : ici on ne fait qu'habiller le passage de l'une à l'autre. Un nouvel
 * ordre reçu en pleine glissade repart de la position affichée, sans saut.
 */
export function createDuckMotion(x: number, y: number) {
  let target = { x, y };
  let from: Pose = { x, y, heading: INITIAL_HEADING };
  let heading = INITIAL_HEADING;
  let start = -Infinity;
  let duration = GLIDE_MS;

  function poseAt(now: number): Pose {
    const t = duration > 0 ? Math.min(1, Math.max(0, (now - start) / duration)) : 1;
    const eased = easeInOut(t);
    return {
      x: from.x + (target.x - from.x) * eased,
      y: from.y + (target.y - from.y) * eased,
      heading: turnTowards(from.heading, heading, eased),
    };
  }

  return {
    poseAt,
    /** Pivote sur place, sans changer de case : un ordre bloqué par un mur. */
    face(dx: number, dy: number, now: number, reducedMotion = false) {
      const next = headingFor(dx, dy);
      if (next === undefined || next === heading) return;
      from = poseAt(now);
      heading = next;
      if (reducedMotion) from = { ...from, heading };
      start = now;
      duration = reducedMotion ? 0 : GLIDE_MS;
    },
    moveTo(nextX: number, nextY: number, now: number, reducedMotion = false) {
      const dx = nextX - target.x;
      const dy = nextY - target.y;
      if (dx === 0 && dy === 0) return;
      const current = poseAt(now);
      const glide = !reducedMotion && shouldGlide(dx, dy);
      target = { x: nextX, y: nextY };
      if (shouldGlide(dx, dy)) heading = headingFor(dx, dy)!;
      from = glide ? current : { x: nextX, y: nextY, heading };
      start = now;
      duration = glide ? GLIDE_MS : 0;
    },
  };
}

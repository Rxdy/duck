import {
  easeInOut,
  GLIDE_MS,
  linear,
  headingFor,
  shouldGlide,
  turnTowards,
} from "../lib/coincoin.js";

/** En deçà de cet écart (réseau, minuteurs), deux pas s'enchaînent. */
const CHAIN_MS = 45;

/** Au départ le bec est tourné vers +x, visible de face par la caméra isométrique. */
const INITIAL_HEADING = Math.PI / 2;

/** Durée de l'apparition du canard replacé à sa base (point marqué, joueur touché). */
export const WARP_MS = 280;

export interface Pose {
  x: number;
  y: number;
  heading: number;
  /** Échelle d'apparition, de 0 à 1 : 1 sauf juste après un retour à la base. */
  appear: number;
}

/** Sortie rapide, léger dépassement : le canard « pop » plutôt qu'il ne grossit mollement. */
export function popIn(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  const c1 = 1.4;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

/**
 * Mouvement d'un canard entre les cases. Le serveur reste seul juge de la case
 * occupée : ici on ne fait qu'habiller le passage de l'une à l'autre. Un nouvel
 * ordre reçu en pleine glissade repart de la position affichée, sans saut.
 */
export function createDuckMotion(x: number, y: number) {
  let target = { x, y };
  let from: Pose = { x, y, heading: INITIAL_HEADING, appear: 1 };
  let warpedAt = -Infinity;
  let heading = INITIAL_HEADING;
  let start = -Infinity;
  let duration = GLIDE_MS;
  let curve = easeInOut;

  /** `since` : temps écoulé depuis la fin du pas précédent, négatif s'il n'est pas fini. */
  function curveFor(since: number) {
    // Enchaîné (ou en plein trajet) : vitesse constante. Seul un départ à l'arrêt est adouci.
    return since <= CHAIN_MS ? linear : easeInOut;
  }

  function poseAt(now: number): Pose {
    const t = duration > 0 ? Math.min(1, Math.max(0, (now - start) / duration)) : 1;
    const eased = curve(t);
    return {
      x: from.x + (target.x - from.x) * eased,
      y: from.y + (target.y - from.y) * eased,
      heading: turnTowards(from.heading, heading, eased),
      appear: popIn((now - warpedAt) / WARP_MS),
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
      curve = easeInOut;
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
      from = glide ? current : { x: nextX, y: nextY, heading, appear: 1 };
      // Un saut qui n'est ni un pas ni un mouvement réduit : le canard réapparaît en « pop ».
      if (!glide && !reducedMotion) warpedAt = now;
      curve = curveFor(now - (start + duration));
      start = now;
      duration = glide ? GLIDE_MS : 0;
    },
  };
}

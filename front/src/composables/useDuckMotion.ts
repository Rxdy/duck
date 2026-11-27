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

/**
 * Toucher : la victime reste à sa case jusqu'à ce que l'attaquant arrive dessus (à mi-glissade, les
 * deux canards se touchent), puis elle est éjectée sur KNOCK_MS avant de réapparaître chez elle. Le
 * serveur, lui, l'a renvoyée d'un coup : sans ce délai, on la voyait disparaître alors que
 * l'attaquant était encore à une case, comme mangée à distance.
 */
export const IMPACT_MS = Math.round(GLIDE_MS * 0.55);
export const KNOCK_MS = 120;

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
  /** Éjection en cours (toucher) : instant de l'impact et case de retour. */
  let knock: { at: number; homeX: number; homeY: number } | undefined;

  /** Fin de l'éjection : la victime est chez elle et y réapparaît en « pop ». */
  function settleKnock(now: number) {
    if (!knock || now < knock.at + KNOCK_MS) return;
    const end = knock.at + KNOCK_MS;
    target = { x: knock.homeX, y: knock.homeY };
    from = { x: knock.homeX, y: knock.homeY, heading, appear: 1 };
    warpedAt = end;
    start = end;
    duration = 0;
    knock = undefined;
  }

  /** `since` : temps écoulé depuis la fin du pas précédent, négatif s'il n'est pas fini. */
  function curveFor(since: number) {
    // Enchaîné (ou en plein trajet) : vitesse constante. Seul un départ à l'arrêt est adouci.
    return since <= CHAIN_MS ? linear : easeInOut;
  }

  function poseAt(now: number): Pose {
    if (knock && now >= knock.at + KNOCK_MS) {
      const end = knock.at + KNOCK_MS;
      return {
        x: knock.homeX,
        y: knock.homeY,
        heading,
        appear: popIn((now - end) / WARP_MS),
      };
    }
    const pose = glidePose(now);
    if (knock && now >= knock.at) {
      // Éjecté : il rétrécit en tournant sur lui-même.
      const k = (now - knock.at) / KNOCK_MS;
      return { ...pose, appear: pose.appear * (1 - k), heading: pose.heading + k * Math.PI * 1.5 };
    }
    return pose;
  }

  function glidePose(now: number): Pose {
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
    /**
     * Touché : renvoyé à (homeX, homeY), mais seulement une fois l'attaquant arrivé, dans `impactIn` ms.
     * La glissade en cours (face à face) se poursuit jusque-là.
     */
    knockOut(
      homeX: number,
      homeY: number,
      now: number,
      impactIn = IMPACT_MS,
      reducedMotion = false,
    ) {
      if (reducedMotion) {
        this.moveTo(homeX, homeY, now, true);
        return;
      }
      settleKnock(now);
      knock = { at: now + Math.max(0, impactIn), homeX, homeY };
    },
    moveTo(nextX: number, nextY: number, now: number, reducedMotion = false) {
      // Un ordre arrivé pendant l'éjection : elle s'achève d'abord, le canard repart de chez lui.
      if (knock) {
        knock = { ...knock, at: Math.min(knock.at, now - KNOCK_MS) };
        settleKnock(now);
      }
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

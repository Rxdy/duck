/**
 * Les gestes des canards d'une scène, calculés à partir du seul temps : même instant, même pose. C'est
 * ce qui les rend testables sans WebGL, et ce qui permet de figer une scène (animations réduites).
 */

export type Behavior =
  /** Se dandine à peine et regarde autour de lui. */
  | { kind: "idle" }
  /** Saute sur place, toutes les `every` secondes. */
  | { kind: "hop"; every: number }
  /** Danse : se balance, rebondit, fait de temps en temps une pirouette. */
  | { kind: "dance" }
  /** Va et vient entre des points (x, z), en s'arrêtant `pause` secondes à chacun. */
  | {
      kind: "patrol";
      points: readonly (readonly [number, number])[];
      speed: number;
      pause: number;
    };

export interface Pose {
  x: number;
  z: number;
  /** Hauteur au-dessus du sol. */
  y: number;
  /** Rotation autour de la verticale ; 0 : le bec vers +z. */
  heading: number;
  /** Inclinaison sur le côté. */
  tilt: number;
}

export interface Placement {
  x: number;
  z: number;
  heading: number;
  /** Décale les gestes de chaque canard : sans cela, tous sautent ensemble. */
  phase?: number;
  behavior: Behavior;
}

const TAU = Math.PI * 2;

/** Cycle d'un geste : 0 au début, 1 à la fin, et 0 en dehors de la fenêtre de `length` secondes. */
function within(t: number, every: number, length: number): number {
  const local = ((t % every) + every) % every;
  return local < length ? local / length : -1;
}

/** Angle de `to` vu depuis `from`, pour regarder dans la direction d'un déplacement. */
const facing = (dx: number, dz: number) => Math.atan2(dx, dz);

function patrol(placement: Placement, behavior: Extract<Behavior, { kind: "patrol" }>, t: number) {
  const points = [[placement.x, placement.z] as const, ...behavior.points];
  // Le trajet revient au départ : on boucle.
  const legs = points.map((from, i) => {
    const to = points[(i + 1) % points.length]!;
    const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
    return { from, to, walk: length / behavior.speed };
  });
  const cycle = legs.reduce((sum, leg) => sum + leg.walk + behavior.pause, 0);
  let local = ((t % cycle) + cycle) % cycle;
  for (const leg of legs) {
    if (local < leg.walk) {
      const k = leg.walk === 0 ? 1 : local / leg.walk;
      return {
        x: leg.from[0] + (leg.to[0] - leg.from[0]) * k,
        z: leg.from[1] + (leg.to[1] - leg.from[1]) * k,
        heading: facing(leg.to[0] - leg.from[0], leg.to[1] - leg.from[1]),
        // Un petit rebond à chaque pas.
        y: Math.abs(Math.sin(local * 9)) * 0.06,
      };
    }
    local -= leg.walk;
    if (local < behavior.pause) {
      return {
        x: leg.to[0],
        z: leg.to[1],
        heading: facing(leg.to[0] - leg.from[0], leg.to[1] - leg.from[1]),
        y: 0,
      };
    }
    local -= behavior.pause;
  }
  return { x: placement.x, z: placement.z, heading: placement.heading, y: 0 };
}

export function poseAt(placement: Placement, time: number): Pose {
  const t = time + (placement.phase ?? 0);
  const rest: Pose = { x: placement.x, z: placement.z, y: 0, heading: placement.heading, tilt: 0 };
  const behavior = placement.behavior;

  switch (behavior.kind) {
    case "idle":
      return {
        ...rest,
        y: Math.max(0, Math.sin(t * 2.2)) * 0.025,
        heading: placement.heading + Math.sin(t * 0.7) * 0.5,
      };
    case "hop": {
      const k = within(t, behavior.every, 0.6);
      return { ...rest, y: k < 0 ? 0 : Math.sin(k * Math.PI) * 0.55 };
    }
    case "dance": {
      const spin = within(t, 7, 1.1);
      return {
        ...rest,
        y: Math.abs(Math.sin(t * 5)) * 0.14,
        tilt: Math.sin(t * 5) * 0.16,
        heading: placement.heading + (spin < 0 ? Math.sin(t * 2.5) * 0.4 : spin * TAU),
      };
    }
    case "patrol":
      return { ...rest, ...patrol(placement, behavior, t), tilt: 0 };
  }
}

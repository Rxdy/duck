import { describe, expect, it } from "vitest";
import { poseAt, type Placement } from "./motion.js";

const at = (behavior: Placement["behavior"], extra: Partial<Placement> = {}): Placement => ({
  x: 1,
  z: 2,
  heading: 0.5,
  behavior,
  ...extra,
});

describe("poseAt", () => {
  it("donne la même pose au même instant", () => {
    const p = at({ kind: "dance" });
    expect(poseAt(p, 3.3)).toEqual(poseAt(p, 3.3));
  });

  it("garde le canard sur sa case quand il ne marche pas", () => {
    for (const behavior of [
      { kind: "idle" },
      { kind: "hop", every: 3 },
      { kind: "dance" },
    ] as const) {
      const pose = poseAt(at(behavior), 4.2);
      expect([pose.x, pose.z]).toEqual([1, 2]);
    }
  });

  it("saute puis retombe au sol", () => {
    const p = at({ kind: "hop", every: 4 });
    expect(poseAt(p, 0.3).y).toBeGreaterThan(0.4);
    expect(poseAt(p, 2).y).toBe(0);
  });

  it("va de point en point en regardant où il va, puis revient", () => {
    const p = at({ kind: "patrol", points: [[3, 2]], speed: 1, pause: 1 });
    // Départ (1,2) vers (3,2) : 2 secondes de marche, 1 de pause, puis retour.
    expect(poseAt(p, 1).x).toBeCloseTo(2);
    expect(poseAt(p, 1).heading).toBeCloseTo(Math.PI / 2);
    expect(poseAt(p, 2.5).x).toBeCloseTo(3);
    expect(poseAt(p, 4).x).toBeCloseTo(2.0, 0);
    expect(poseAt(p, 6).x).toBeCloseTo(1, 0);
  });

  it("décale les canards par la phase", () => {
    const base = at({ kind: "hop", every: 4 });
    expect(poseAt(base, 0.3).y).not.toBe(poseAt({ ...base, phase: 2 }, 0.3).y);
  });
});

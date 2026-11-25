import { describe, expect, it } from "vitest";
import { GLIDE_MS } from "../lib/coincoin.js";
import { createDuckMotion } from "./useDuckMotion.js";

describe("createDuckMotion", () => {
  it("glisse d'une case à la voisine", () => {
    const motion = createDuckMotion(1, 1);
    motion.moveTo(2, 1, 0);
    expect(motion.poseAt(0).x).toBe(1);
    expect(motion.poseAt(GLIDE_MS / 2).x).toBeCloseTo(1.5);
    expect(motion.poseAt(GLIDE_MS).x).toBe(2);
  });

  it("repart de la position affichée si un ordre arrive en pleine glissade", () => {
    const motion = createDuckMotion(1, 1);
    motion.moveTo(2, 1, 0);
    const before = motion.poseAt(GLIDE_MS / 2);
    motion.moveTo(2, 2, GLIDE_MS / 2);
    const after = motion.poseAt(GLIDE_MS / 2);
    expect([after.x, after.y]).toEqual([before.x, before.y]);
    expect(motion.poseAt(GLIDE_MS * 2)).toMatchObject({ x: 2, y: 2 });
  });

  it("replace d'un coup un canard renvoyé à sa base", () => {
    const motion = createDuckMotion(9, 4);
    motion.moveTo(1, 1, 0);
    expect(motion.poseAt(0)).toMatchObject({ x: 1, y: 1 });
  });

  it("ne glisse pas quand les animations sont réduites", () => {
    const motion = createDuckMotion(1, 1);
    motion.moveTo(2, 1, 0, true);
    expect(motion.poseAt(0).x).toBe(2);
  });

  it("pivote sur place quand le pas est bloqué", () => {
    const motion = createDuckMotion(1, 1);
    motion.face(-1, 0, 0);
    expect(motion.poseAt(GLIDE_MS)).toMatchObject({ x: 1, y: 1, heading: -Math.PI / 2 });
  });
});

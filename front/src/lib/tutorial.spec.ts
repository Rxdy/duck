import { describe, expect, it } from "vitest";
import {
  allowedMoves,
  applyStep,
  createWorld,
  distance,
  isTaskDone,
  LESSONS,
  targetOf,
} from "./tutorial.js";

describe("camp d'entraînement", () => {
  // Chaque leçon doit pouvoir se terminer en ne suivant que les coups autorisés.
  it.each(LESSONS.filter((l) => l.key !== "match"))("« $title » est faisable", (lesson) => {
    let world = createWorld(lesson);
    for (const task of lesson.tasks) {
      let done = false;
      for (let i = 0; i < 30 && !done; i++) {
        const [direction] = allowedMoves(world, task);
        expect(direction).toBeDefined();
        const outcome = applyStep(world, "me", direction!, 0);
        done = isTaskDone(task, outcome, direction!);
        world = outcome.world;
      }
      expect(done).toBe(true);
    }
  });

  it("refuse de s'éloigner de la case visée", () => {
    const lesson = LESSONS[0]!;
    const world = createWorld(lesson);
    expect(allowedMoves(world, lesson.tasks[0]!)).toEqual(["RIGHT"]);
  });

  it("n'accepte contre le mur que l'appui demandé, qui fait pivoter sans avancer", () => {
    const lesson = LESSONS[1]!;
    const world = { ...createWorld(lesson) };
    world.me = { ...world.me, x: 3, y: 2 };
    expect(allowedMoves(world, lesson.tasks[1]!)).toEqual(["RIGHT"]);
    expect(applyStep(world, "me", "RIGHT", 0).world.me).toMatchObject({
      x: 3,
      y: 2,
      facing: "RIGHT",
    });
  });

  it("la base adverse est atteignable dans le match final", () => {
    const lesson = LESSONS.at(-1)!;
    const world = createWorld(lesson);
    expect(distance(world.rows, world.me, targetOf(world, lesson.tasks[0]!)!)).toBeLessThan(30);
  });
});

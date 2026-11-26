import { afterEach, describe, expect, it, vi } from "vitest";
import { GLIDE_MS } from "./coincoin.js";
import { createStepPacer } from "./stepPacer.js";

describe("createStepPacer", () => {
  afterEach(() => vi.useRealTimers());

  it("ne fait qu'un pas par glissade, même en martelant, puis le dernier demandé", () => {
    vi.useFakeTimers();
    const run = vi.fn();
    const pacer = createStepPacer(run);

    for (const direction of ["UP", "RIGHT", "LEFT", "DOWN"] as const) pacer.push(direction);
    expect(run.mock.calls).toEqual([["UP"]]);

    vi.advanceTimersByTime(GLIDE_MS);
    expect(run.mock.calls).toEqual([["UP"], ["DOWN"]]);
    vi.advanceTimersByTime(GLIDE_MS * 3);
    expect(run).toHaveBeenCalledTimes(2);
  });

  it("repart aussitôt quand le canard est au repos", () => {
    vi.useFakeTimers();
    const run = vi.fn();
    const pacer = createStepPacer(run);
    pacer.push("UP");
    vi.advanceTimersByTime(GLIDE_MS);

    pacer.push("UP");

    expect(run).toHaveBeenCalledTimes(2);
  });

  it("oublie le pas en attente quand on le lui demande", () => {
    vi.useFakeTimers();
    const run = vi.fn();
    const pacer = createStepPacer(run);
    pacer.push("UP");
    pacer.push("DOWN");
    pacer.clear();

    vi.advanceTimersByTime(GLIDE_MS * 2);

    expect(run).toHaveBeenCalledTimes(1);
  });
});

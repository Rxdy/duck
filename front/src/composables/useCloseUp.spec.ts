import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope, nextTick, ref } from "vue";
import { OVERVIEW_MS, useCloseUp } from "./useCloseUp.js";

describe("useCloseUp", () => {
  afterEach(() => vi.useRealTimers());

  it("montre la carte entière, puis passe en gros plan une fois la partie prête", async () => {
    vi.useFakeTimers();
    const ready = ref(false);
    const scope = effectScope();
    const closeUp = scope.run(() => useCloseUp(() => ready.value))!;

    vi.advanceTimersByTime(OVERVIEW_MS * 2);
    expect(closeUp.value).toBe(false);

    ready.value = true;
    await nextTick();
    expect(closeUp.value).toBe(false);
    vi.advanceTimersByTime(OVERVIEW_MS);
    expect(closeUp.value).toBe(true);
    scope.stop();
  });
});

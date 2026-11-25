import { computed, onScopeDispose, ref, watch } from "vue";
import { countdownLabel, GO_MS } from "../lib/countdown.js";

/** Suit un décompte qui se termine à `until()` (instant de l'horloge locale). */
export function useCountdown(until: () => number | null) {
  const remaining = ref(0);
  const label = ref<string>();
  let ticker: ReturnType<typeof setInterval> | undefined;
  const stop = () => clearInterval(ticker);

  function tick() {
    const end = until();
    if (end === null) return;
    remaining.value = end - Date.now();
    label.value = countdownLabel(remaining.value);
    if (remaining.value <= -GO_MS) stop();
  }

  watch(
    until,
    (end) => {
      stop();
      label.value = undefined;
      remaining.value = 0;
      // Une partie rejointe en cours (décompte déjà loin) n'affiche rien.
      if (end === null || end <= Date.now()) return;
      tick();
      ticker = setInterval(tick, 100);
    },
    { immediate: true },
  );
  onScopeDispose(stop);

  return { label, counting: computed(() => remaining.value > 0) };
}

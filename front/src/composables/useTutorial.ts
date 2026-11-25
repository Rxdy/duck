import { computed, onUnmounted, ref } from "vue";
import type { Direction } from "../types.js";
import {
  allowedMoves,
  applyStep,
  createWorld,
  isTaskDone,
  LESSONS,
  rivalMove,
  targetOf,
  type World,
} from "../lib/tutorial.js";

const STORAGE_KEY = "duck:tutorial";
/** Lent exprès : le but est d'apprendre, pas de perdre. */
const RIVAL_INTERVAL_MS = 850;

function loadCompleted(): number {
  try {
    const value = Number(localStorage.getItem(STORAGE_KEY));
    return Number.isInteger(value) ? Math.min(LESSONS.length, Math.max(0, value)) : 0;
  } catch {
    return 0;
  }
}

export type Phase = "menu" | "intro" | "play" | "success";

export function useTutorial() {
  const completed = ref(loadCompleted());
  const phase = ref<Phase>("menu");
  const index = ref(0);
  const taskIndex = ref(0);
  const world = ref<World>(createWorld(LESSONS[0]!));
  const feedback = ref<string>();
  let timer: ReturnType<typeof setInterval> | undefined;

  const lesson = computed(() => LESSONS[index.value]!);
  const task = computed(() => lesson.value.tasks[taskIndex.value]!);
  const guided = computed(() => task.value.kind !== "match");
  const target = computed(() =>
    phase.value === "play" ? targetOf(world.value, task.value) : undefined,
  );
  const hint = computed(() =>
    phase.value === "play" && guided.value ? allowedMoves(world.value, task.value)[0] : undefined,
  );
  /** Une leçon s'ouvre quand la précédente est réussie. */
  const isUnlocked = (i: number) => i <= completed.value;

  function stop() {
    clearInterval(timer);
    timer = undefined;
  }

  function open(i: number) {
    if (!isUnlocked(i)) return;
    stop();
    index.value = i;
    taskIndex.value = 0;
    feedback.value = undefined;
    world.value = createWorld(LESSONS[i]!);
    phase.value = "intro";
  }

  function finish() {
    stop();
    phase.value = "success";
    completed.value = Math.max(completed.value, index.value + 1);
    try {
      localStorage.setItem(STORAGE_KEY, String(completed.value));
    } catch {
      // Stockage indisponible : la progression vaut pour cette visite.
    }
  }

  function rivalTurn() {
    const direction = world.value.rival && rivalMove(world.value);
    if (!direction) return;
    const outcome = applyStep(world.value, "rival", direction, Date.now());
    world.value = outcome.world;
    if (outcome.tagged) feedback.value = "Il t'a touché ! Retour à ta base.";
    const current = task.value;
    if (current.kind === "match" && world.value.rival!.score >= current.points) {
      stop();
      world.value = createWorld(lesson.value);
      feedback.value = "Il a gagné cette manche. On recommence !";
      phase.value = "intro";
    }
  }

  function start() {
    phase.value = "play";
    if (task.value.kind === "match") timer = setInterval(rivalTurn, RIVAL_INTERVAL_MS);
  }

  function move(direction: Direction) {
    if (phase.value !== "play") return;
    if (!allowedMoves(world.value, task.value).includes(direction)) {
      feedback.value = "Pas par là ! Suis le bouton allumé.";
      return;
    }
    const outcome = applyStep(world.value, "me", direction, Date.now());
    world.value = outcome.world;
    feedback.value = undefined;
    if (!isTaskDone(task.value, outcome, direction)) {
      if (outcome.scored) feedback.value = "+3 points !";
      else if (outcome.tagged) feedback.value = "Touché, 1 point volé !";
      return;
    }
    if (taskIndex.value + 1 < lesson.value.tasks.length) taskIndex.value++;
    else finish();
  }

  function backToMenu() {
    stop();
    phase.value = "menu";
  }

  onUnmounted(stop);

  return {
    completed,
    phase,
    index,
    taskIndex,
    world,
    lesson,
    task,
    target,
    hint,
    feedback,
    isUnlocked,
    open,
    start,
    move,
    backToMenu,
  };
}

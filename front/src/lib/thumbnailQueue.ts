import { PLAYER_COLORS } from "../theme.js";

/** Les vignettes sont dessinées une par une, entre deux images : la page reste fluide. */
type Job = { id: string; done: (url: string | undefined) => void };

const jobs: Job[] = [];
let running = false;

async function run() {
  running = true;
  const { renderAccessory } = await import("./duckRenderer.js");
  while (jobs.length) {
    const job = jobs.shift()!;
    job.done(renderAccessory(job.id, PLAYER_COLORS[0]!));
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  running = false;
}

/** Renvoie de quoi annuler, pour une vignette qui disparaît avant son tour. */
export function queueThumbnail(id: string, done: Job["done"]): () => void {
  const job = { id, done };
  jobs.push(job);
  if (!running) void run();
  return () => {
    const at = jobs.indexOf(job);
    if (at >= 0) jobs.splice(at, 1);
  };
}

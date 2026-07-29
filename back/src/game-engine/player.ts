import type { PlayerId } from "../shared.js";

export interface Player {
  id: PlayerId;
  name: string;
  color: string;
  x: number;
  y: number;
  spawnX: number;
  spawnY: number;
  score: number;
}

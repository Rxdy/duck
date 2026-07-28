import type { PlayerId } from "@duck/shared";

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

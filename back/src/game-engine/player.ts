import type { PlayerId } from "../shared.js";

export interface Player {
  id: PlayerId;
  name: string;
  color: string;
  // Accessoire cosmétique équipé (voir back/src/skins.ts) : "none" pour un
  // bot ou un joueur non connecté, qui n'ont pas de compte/skin.
  accessory: string;
  x: number;
  y: number;
  spawnX: number;
  spawnY: number;
  score: number;
}

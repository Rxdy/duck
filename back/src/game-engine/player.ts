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
  // Instant (epoch ms) jusqu'auquel le joueur est intouchable, après un
  // retour au spawn (touché ou point marqué). 0 = pas d'immunité. Voir
  // game.ts#applyMove : elle est purement DÉFENSIVE — un joueur immunisé ne
  // peut pas non plus toucher les autres, sinon réapparaître deviendrait une
  // arme gratuite contre celui qui campe la sortie.
  immuneUntil: number;
}

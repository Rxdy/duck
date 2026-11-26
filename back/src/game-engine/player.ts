import type { Direction } from "../protocol.js";
import type { PlayerId } from "../shared.js";

export interface Player {
  id: PlayerId;
  name: string;
  color: string;
  // Accessoires portés (voir back/src/wardrobe.ts) : vide pour un bot ou un
  // joueur non connecté, qui n'ont pas de garde-robe.
  outfit: string[];
  x: number;
  y: number;
  spawnX: number;
  spawnY: number;
  score: number;
  // Côté vers lequel le canard est tourné : celui du dernier ordre reçu, même
  // si un mur l'a empêché d'avancer. Absent tant qu'il n'a reçu aucun ordre.
  facing?: Direction;
  // Instant (epoch ms) jusqu'auquel le joueur est intouchable, après un
  // retour au spawn (touché ou point marqué). 0 = pas d'immunité. Voir
  // game.ts#applyMove : elle est purement DÉFENSIVE — un joueur immunisé ne
  // peut pas non plus toucher les autres, sinon réapparaître deviendrait une
  // arme gratuite contre celui qui campe la sortie.
  immuneUntil: number;
}

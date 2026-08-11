import type { GameId } from "../shared.js";
import type { Direction } from "../protocol.js";
import { type GameMap, Tile, isWalkable, tileAt } from "./tile.js";
import type { Player } from "./player.js";

export interface GameState {
  id: GameId;
  map: GameMap;
  players: Player[];
}

export const DIRECTION_DELTA: Record<Direction, { dx: number; dy: number }> = {
  UP: { dx: 0, dy: -1 },
  DOWN: { dx: 0, dy: 1 },
  LEFT: { dx: -1, dy: 0 },
  RIGHT: { dx: 1, dy: 0 },
};

/**
 * Durée d'intouchabilité après un retour au spawn. Elle règle le spawn kill
 * par construction : on réapparaît protégé, le temps de repartir, plutôt que
 * d'être cueilli sur place par un adversaire qui attend. Assez courte pour ne
 * jamais servir à attaquer — et de toute façon un joueur immunisé ne peut pas
 * toucher (voir canTag).
 */
export const IMMUNITY_MS = 1500;

/**
 * Barème. Deux façons de marquer, volontairement inégales :
 *
 * - **Atteindre une base adverse rapporte le plus** : c'est l'objectif du jeu,
 *   il doit rester le meilleur moyen de gagner. Sinon la partie dégénère en
 *   chasse à l'homme au milieu du terrain, base ignorée.
 * - **Toucher un adversaire lui VOLE un point** : l'attaquant gagne exactement
 *   ce que la victime perd. Un vrai vol, donc un écart de 2 points au
 *   classement pour une seule action — assez pour rendre la défense payante
 *   sans jamais rivaliser avec une percée.
 *
 * Le vol est plafonné par ce que la victime possède : on ne descend jamais
 * sous zéro (une spirale négative décourage plus qu'elle ne punit), et
 * s'acharner sur un joueur à zéro ne rapporte rien — il faut aller marquer.
 */
export const POINTS_PER_BASE = 3;
export const POINTS_STOLEN_PER_TAG = 1;

export function isImmune(player: Player, now: number): boolean {
  return player.immuneUntil > now;
}

/**
 * Un joueur touche l'autre en entrant sur sa case. L'immunité protège dans
 * les DEUX sens : ni l'immunisé ne peut être renvoyé, ni lui-même renvoyer
 * quelqu'un. Sinon réapparaître donnerait une arme gratuite contre celui qui
 * attend devant la base, en boucle.
 */
function canTag(mover: Player, target: Player, now: number): boolean {
  return !isImmune(target, now) && !isImmune(mover, now);
}

function sentHome(player: Player, now: number): Player {
  return { ...player, x: player.spawnX, y: player.spawnY, immuneUntil: now + IMMUNITY_MS };
}

export function applyMove(
  state: GameState,
  playerId: string,
  direction: Direction,
  now: number = Date.now(),
): GameState {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return state;

  // Le typage promet une des quatre directions ; le réseau, lui, ne promet
  // rien. Déstructurer directement le résultat de DIRECTION_DELTA a longtemps
  // suffi à faire tomber le serveur entier depuis un WebSocket (direction
  // inconnue -> `undefined` -> TypeError). L'entrée est filtrée depuis (voir
  // clientMessage.ts) ; ce garde-fou reste parce que le moteur ne doit
  // dépendre d'aucun appelant pour tenir debout. Un coup incompréhensible ne
  // change rien à l'état, c'est tout.
  const delta = DIRECTION_DELTA[direction];
  if (!delta) return state;

  const { dx, dy } = delta;
  const targetX = player.x + dx;
  const targetY = player.y + dy;

  if (!isWalkable(state.map, targetX, targetY)) {
    return state;
  }

  // Un autre joueur occupe la case visée : soit on le TOUCHE (il repart à son
  // spawn, on prend sa place), soit il fait mur — quand l'un des deux est
  // immunisé. Perdre sa position, pas ses points : la sanction est du temps
  // de trajet, pas un score effacé, ce qui garde les remontées possibles.
  const blocker = state.players.find(
    (p) => p.id !== playerId && p.x === targetX && p.y === targetY,
  );
  if (blocker && !canTag(player, blocker, now)) {
    return state;
  }

  // Deux façons de marquer : un Goal partagé (mode équipe, une seule base
  // pour tous) ou la base individuelle d'un autre joueur (Duel/FFA, voir
  // docs/02-gameplay.md#modes-de-jeu — "chaque joueur possède sa propre
  // base... entrer sur une base adverse rapporte +1 point").
  const reachedSharedGoal = tileAt(state.map, targetX, targetY) === Tile.Goal;
  const reachedEnemyBase = state.players.some(
    (p) => p.id !== playerId && p.spawnX === targetX && p.spawnY === targetY,
  );

  // Le joueur touché repart chez lui, protégé le temps de se remettre en
  // route, et se fait voler un point. C'est appliqué AVANT le score : entrer
  // sur une base adverse occupée par son propriétaire le vole ET rapporte la
  // base, dans le même mouvement.
  const stolen = blocker ? Math.min(POINTS_STOLEN_PER_TAG, blocker.score) : 0;
  const afterTag: Player[] = blocker
    ? state.players.map((p) =>
        p.id === blocker.id ? { ...sentHome(p, now), score: p.score - stolen } : p,
      )
    : state.players;

  const scored = reachedSharedGoal || reachedEnemyBase;
  const gained = stolen + (scored ? POINTS_PER_BASE : 0);

  if (scored) {
    // Seul le marqueur est renvoyé à son spawn ; les autres restent où ils
    // sont — la partie continue sans interruption pour eux. Il y réapparaît
    // immunisé comme n'importe quel retour au spawn, sinon marquer serait le
    // meilleur moyen de se faire cueillir chez soi juste après.
    return {
      ...state,
      players: afterTag.map((p) =>
        p.id === playerId ? { ...sentHome(p, now), score: p.score + gained } : p,
      ),
    };
  }

  const updatedPlayer: Player = { ...player, x: targetX, y: targetY, score: player.score + gained };
  return {
    ...state,
    players: afterTag.map((p) => (p.id === playerId ? updatedPlayer : p)),
  };
}

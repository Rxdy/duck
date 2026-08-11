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

export function applyMove(state: GameState, playerId: string, direction: Direction): GameState {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return state;

  const { dx, dy } = DIRECTION_DELTA[direction];
  const targetX = player.x + dx;
  const targetY = player.y + dy;

  if (!isWalkable(state.map, targetX, targetY)) {
    return state;
  }

  // Un autre joueur (humain ou bot) occupe déjà la case visée : on ne peut
  // pas le traverser, exactement comme un mur.
  const blockedByPlayer = state.players.some(
    (p) => p.id !== playerId && p.x === targetX && p.y === targetY,
  );
  if (blockedByPlayer) {
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

  if (reachedSharedGoal || reachedEnemyBase) {
    // Seul le marqueur est renvoyé à son spawn ; les autres restent où ils
    // sont — la partie continue sans interruption pour eux.
    return {
      ...state,
      players: state.players.map((p) =>
        p.id === playerId ? { ...p, x: p.spawnX, y: p.spawnY, score: p.score + 1 } : p,
      ),
    };
  }

  const updatedPlayer: Player = { ...player, x: targetX, y: targetY };
  return {
    ...state,
    players: state.players.map((p) => (p.id === playerId ? updatedPlayer : p)),
  };
}

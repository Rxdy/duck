import type { GameId } from "../shared.js";
import type { Direction } from "../protocol.js";
import { type GameMap, Tile, isWalkable, tileAt } from "./tile.js";
import type { Player } from "./player.js";

export interface GameState {
  id: GameId;
  map: GameMap;
  players: Player[];
}

const DIRECTION_DELTA: Record<Direction, { dx: number; dy: number }> = {
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

  const reachedGoal = tileAt(state.map, targetX, targetY) === Tile.Goal;

  if (reachedGoal) {
    // Un point marqué clôt la manche : tout le monde retourne à son spawn.
    // Sinon, si un autre joueur arrive sur un but au même moment, il marquerait
    // aussi juste après alors que la manche est déjà terminée.
    return {
      ...state,
      players: state.players.map((p) =>
        p.id === playerId
          ? { ...p, x: p.spawnX, y: p.spawnY, score: p.score + 1 }
          : { ...p, x: p.spawnX, y: p.spawnY },
      ),
    };
  }

  const updatedPlayer: Player = { ...player, x: targetX, y: targetY };
  return {
    ...state,
    players: state.players.map((p) => (p.id === playerId ? updatedPlayer : p)),
  };
}

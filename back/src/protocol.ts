import type { GameId, PlayerId } from "./shared.js";

export type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";

export interface PlayerState {
  id: PlayerId;
  name: string;
  color: string;
  x: number;
  y: number;
  score: number;
}

export interface JoinMessage {
  type: "JOIN";
  gameId: GameId;
  name: string;
}

export interface MoveMessage {
  type: "MOVE";
  direction: Direction;
}

export interface StateMessage {
  type: "STATE";
  players: PlayerState[];
}

export interface ScoreMessage {
  type: "SCORE";
  playerId: PlayerId;
  score: number;
}

export interface EndMessage {
  type: "END";
  winnerId: PlayerId | null;
}

export interface PingMessage {
  type: "PING";
}

/**
 * Lance une partie d'entraînement solo sur une carte custom (éditeur), au
 * lieu de rejoindre une carte générée procéduralement. `tiles` contient les
 * valeurs de l'enum Tile (voir game-engine/tile.ts) sous forme de chaînes.
 */
export interface JoinTestMessage {
  type: "JOIN_TEST";
  map: {
    width: number;
    height: number;
    tiles: string[][];
  };
}

export type ClientMessage = JoinMessage | MoveMessage | PingMessage | JoinTestMessage;
export type ServerMessage = StateMessage | ScoreMessage | EndMessage;

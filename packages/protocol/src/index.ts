import type { GameId, PlayerId } from "@duck/shared";

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

export type ClientMessage = JoinMessage | MoveMessage | PingMessage;
export type ServerMessage = StateMessage | ScoreMessage | EndMessage;

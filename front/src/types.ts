export type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";

export interface PlayerState {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  score: number;
}

export interface JoinMessage {
  type: "JOIN";
  gameId: string;
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
  playerId: string;
  score: number;
}

export interface EndMessage {
  type: "END";
  winnerId: string | null;
}

/**
 * Lance une partie d'entraînement solo sur une carte custom (éditeur), voir
 * back/src/protocol.ts. `tiles` utilise les valeurs de l'enum Tile côté
 * serveur ("Empty" | "Wall" | "Spawn" | "Goal" | "Water" | "Bonus").
 */
export interface JoinTestMessage {
  type: "JOIN_TEST";
  map: {
    width: number;
    height: number;
    tiles: string[][];
  };
}

export type ClientMessage = JoinMessage | MoveMessage | JoinTestMessage;
export type ServerMessage = StateMessage | ScoreMessage | EndMessage;

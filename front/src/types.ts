export type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";

export interface PlayerState {
  id: string;
  name: string;
  color: string;
  // Accessoire cosmétique équipé (voir lib/duckAccessories.ts) : "none" pour
  // un bot ou un joueur non connecté.
  accessory: string;
  x: number;
  y: number;
  // Position du spawn/base du joueur, pour afficher le territoire autour de
  // chaque base (voir lib/board.ts#applyTerritoryTint).
  spawnX: number;
  spawnY: number;
  score: number;
}

export interface JoinMessage {
  type: "JOIN";
  gameId: string;
  name: string;
  // Identifiant anonyme persistant côté navigateur (voir lib/anonId.ts) :
  // pas encore de comptes, sert à associer une partie enregistrée à
  // "quelqu'un" en vue d'une fusion vers un vrai compte plus tard.
  anonId: string;
  // Token de session (voir store/authStore.ts), si connecté : permet au
  // serveur de retrouver le skin équipé du compte pour l'afficher en partie.
  token?: string;
}

export interface MoveMessage {
  type: "MOVE";
  direction: Direction;
}

export interface StateMessage {
  type: "STATE";
  players: PlayerState[];
}

/**
 * Envoyée une fois à la connexion (mode "Jouer", pas en entraînement où la
 * carte est déjà connue localement) : la carte est fixe pour la manche,
 * inutile de la répéter dans chaque STATE. `tiles` utilise les valeurs de
 * l'enum Tile côté serveur ("Empty" | "Wall" | "Spawn" | "Goal" | "Water" | "Bonus").
 */
export interface MapMessage {
  type: "MAP";
  width: number;
  height: number;
  tiles: string[][];
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
    // Position de chaque spawn, dans l'ordre des couleurs (voir
    // lib/mapEditor.ts#toWireSpawns) : permet au serveur d'assigner à chaque
    // joueur la couleur du spawn sur lequel il apparaît.
    spawns: { x: number; y: number }[];
  };
}

export type ClientMessage = JoinMessage | MoveMessage | JoinTestMessage;
export type ServerMessage = StateMessage | ScoreMessage | EndMessage | MapMessage;

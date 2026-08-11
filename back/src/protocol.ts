import type { BotLevel } from "./bots.js";
import type { GameId, GameMode, PlayerId } from "./shared.js";

export type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";

export interface PlayerState {
  id: PlayerId;
  name: string;
  color: string;
  // Accessoire cosmétique équipé (voir back/src/skins.ts) : "none" pour un
  // bot ou un joueur non connecté.
  accessory: string;
  x: number;
  y: number;
  // Position du spawn/base du joueur (constante pour la manche) : transmise
  // au client pour qu'il puisse afficher le territoire autour de chaque base
  // (voir front/src/lib/board.ts#applyTerritoryTint), indépendamment de sa
  // position actuelle sur le plateau.
  spawnX: number;
  spawnY: number;
  score: number;
  // Millisecondes d'intouchabilité restantes au moment de l'envoi (0 = aucune),
  // pour que le client signale l'état (voir front/src/components/organisms/
  // DuckSprite.vue). Une DURÉE plutôt qu'un instant : l'horloge du navigateur
  // n'est pas celle du serveur, comparer deux dates donnerait n'importe quoi.
  immuneForMs: number;
}

export interface JoinMessage {
  type: "JOIN";
  gameId: GameId;
  name: string;
  // Identifiant anonyme persistant côté navigateur (voir
  // front/src/lib/anonId.ts) : pas encore de comptes, sert à associer une
  // partie enregistrée (back/src/db.ts) à "quelqu'un" plutôt qu'à personne,
  // en vue d'une fusion vers un vrai compte plus tard.
  anonId: string;
  // Token de session (voir front/src/store/authStore.ts), si connecté :
  // permet de retrouver le skin équipé du compte (back/src/skins.ts) pour
  // l'afficher sur le canard en partie. Absent si non connecté.
  token?: string;
  // Mode choisi (voir shared.ts#GAME_MODES) : décide du nombre de joueurs, et
  // donc de la carte et du nombre de bots. Absent -> duel, pour qu'un client
  // plus ancien continue de fonctionner.
  mode?: GameMode;
  // Niveau imposé aux bots de la partie (voir bots.ts#BOT_LEVELS). Sert à
  // essayer et régler la difficulté ; le jour où le classement existera,
  // c'est le serveur qui le choisira d'après l'Elo du joueur, et ce champ
  // n'aura plus à être écouté.
  botLevel?: BotLevel;
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
 * Envoyé une fois à la connexion (voir back/src/room.ts#getMapMessage),
 * juste après le JOIN : la carte est fixe pour toute la durée de la manche,
 * inutile de la répéter dans chaque STATE. `tiles` contient les valeurs de
 * l'enum Tile (game-engine/tile.ts) sous forme de chaînes.
 */
export interface MapMessage {
  type: "MAP";
  width: number;
  height: number;
  tiles: string[][];
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
 * `spawns` liste la position de chaque spawn et l'indice de sa couleur dans
 * PLAYER_COLORS (voir front/src/lib/mapEditor.ts#toWireSpawns), pour que
 * chaque joueur apparaisse avec la couleur du spawn sur lequel il est posé —
 * l'indice est nécessaire, une carte peut n'utiliser qu'une partie des
 * couleurs et la position dans la liste ne dit alors rien de la couleur.
 */
export interface JoinTestMessage {
  type: "JOIN_TEST";
  map: {
    width: number;
    height: number;
    tiles: string[][];
    spawns: WireSpawn[];
  };
}

/** Spawn tel qu'il circule sur le fil : position + indice de couleur. */
export interface WireSpawn {
  x: number;
  y: number;
  color: number;
}

/**
 * Le serveur ne peut pas honorer la demande (aucune carte pour le mode
 * choisi, par exemple). Distinct de END : la partie n'a jamais commencé, et
 * le client doit le DIRE plutôt que d'afficher un plateau vide et laisser le
 * joueur attendre un adversaire qui n'arrivera pas.
 */
export interface ErrorMessage {
  type: "ERROR";
  message: string;
}

export type ClientMessage = JoinMessage | MoveMessage | PingMessage | JoinTestMessage;
export type ServerMessage = StateMessage | ScoreMessage | EndMessage | MapMessage | ErrorMessage;

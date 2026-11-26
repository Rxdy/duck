export type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";

export interface PlayerState {
  id: string;
  name: string;
  color: string;
  // Accessoires portés (voir lib/accessories/) : vide pour un bot ou un joueur
  // non connecté.
  outfit: string[];
  x: number;
  y: number;
  // Position du spawn/base du joueur, pour afficher le territoire autour de
  // chaque base (voir lib/board.ts#applyTerritoryTint).
  spawnX: number;
  spawnY: number;
  score: number;
  // Côté vers lequel le canard est tourné, même bloqué contre un mur.
  facing?: Direction;
  // Millisecondes d'intouchabilité restantes à la réception du message (voir
  // back/src/protocol.ts) : une durée, pas un instant, parce que l'horloge du
  // navigateur n'est pas celle du serveur.
  immuneForMs: number;
}

/**
 * Les modes de la V1 (voir docs/02-gameplay.md#modes-de-jeu) : mêmes
 * règles, seul le nombre de joueurs change. Doit rester synchronisé à la main
 * avec GAME_MODES dans back/src/shared.ts — front/ ne partage pas de code
 * avec back/ (voir docs/06-architecture-technique.md).
 */
export type GameMode = "duel" | "ffa4";

/**
 * Niveaux de bots (voir back/src/bots.ts) : la cadence et la qualité de
 * décision montent ensemble. Réglable depuis l'URL pour essayer une partie
 * contre chacun (voir pages/Game.vue).
 */
export type BotLevel = "debutant" | "intermediaire" | "confirme" | "expert" | "impossible";

export interface JoinMessage {
  type: "JOIN";
  gameId: string;
  name: string;
  // Identifiant anonyme persistant côté navigateur (voir lib/anonId.ts) :
  // pas encore de comptes, sert à associer une partie enregistrée à
  // "quelqu'un" en vue d'une fusion vers un vrai compte plus tard.
  anonId: string;
  // Token de session (voir store/authStore.ts), si connecté : permet au
  // serveur de retrouver la tenue du compte pour l'afficher en partie.
  token?: string;
  // Mode choisi (voir pages/Play.vue) : décide du nombre de joueurs, donc de
  // la carte et du nombre de bots côté serveur.
  mode?: GameMode;
  // Niveau imposé aux bots, pour essayer la difficulté (voir pages/Game.vue).
  botLevel?: BotLevel;
}

export interface MoveMessage {
  type: "MOVE";
  direction: Direction;
}

export interface StateMessage {
  type: "STATE";
  // Temps restant du décompte de départ.
  countdownMs?: number;
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
  // Identifiant de son propre joueur.
  you?: string;
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
  token?: string;
  map: {
    width: number;
    height: number;
    tiles: string[][];
    // Position de chaque spawn ET indice de sa couleur dans PLAYER_COLORS
    // (voir lib/mapEditor.ts#toWireSpawns) : permet au serveur d'assigner à
    // chaque joueur la couleur du spawn sur lequel il apparaît, même quand
    // toutes les couleurs ne sont pas posées.
    spawns: { x: number; y: number; color: number }[];
  };
}

/**
 * Le serveur ne peut pas honorer la demande (aucune carte pour le mode
 * choisi...). Distinct de END : la partie n'a jamais commencé, il faut le
 * dire au joueur plutôt que de le laisser devant un plateau vide.
 */
export interface ErrorMessage {
  type: "ERROR";
  message: string;
}

/**
 * La salle réunit encore ses joueurs (voir back/src/matchmaking.ts) : la
 * partie n'est pas partie et le serveur refuse les coups. Distinct de STATE,
 * qui veut dire « à toi de jouer » : sans ce message on afficherait un plateau
 * jouable dont les touches ne répondent pas, ce qui se lit comme un bug.
 *
 * `startsInMs` est le temps restant AU PLUS : la partie part avant si la salle
 * se remplit d'humains.
 */
export interface WaitingMessage {
  type: "WAITING";
  players: PlayerState[];
  capacity: number;
  startsInMs: number;
}

/** Salons des parties personnalisées (voir back/src/protocol.ts). */
export type LobbyMessage =
  | { type: "LOBBY_CREATE"; token: string; mode: GameMode }
  | { type: "LOBBY_JOIN"; token: string; code: string }
  | { type: "LOBBY_SETTINGS"; mode?: GameMode; bots?: number; botLevel?: BotLevel }
  | { type: "LOBBY_INVITE"; tag: string }
  | { type: "LOBBY_START" };

export interface LobbyState {
  code: string;
  mode: GameMode;
  capacity: number;
  bots: number;
  botLevel: BotLevel;
  botLabel: string;
  playing: boolean;
  /** Le premier est l'hôte. */
  players: { username: string; tag: string }[];
  invited: string[];
}

export type LobbyServerMessage =
  { type: "LOBBY"; lobby: LobbyState; you: string } | { type: "LOBBY_CLOSED"; reason: string };

export type ClientMessage = JoinMessage | MoveMessage | JoinTestMessage | LobbyMessage;
export type ServerMessage =
  | StateMessage
  | ScoreMessage
  | EndMessage
  | MapMessage
  | ErrorMessage
  | WaitingMessage
  | LobbyServerMessage;

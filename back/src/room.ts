import {
  applyMove,
  DIRECTION_DELTA,
  isWalkable,
  Tile,
  type GameMap,
  type GameState,
  type Player,
} from "./game-engine/index.js";
import type {
  ClientMessage,
  Direction,
  MapMessage,
  PlayerState,
  ServerMessage,
} from "./protocol.js";
import { PLAYER_COLORS } from "./shared.js";
import type { MatchResult } from "./db.js";
import type { WebSocket } from "ws";

const BOT_DIRECTIONS: Direction[] = ["UP", "DOWN", "LEFT", "RIGHT"];
const BOT_MOVE_INTERVAL_MS = 700;
// Un keydown répété (touche maintenue/auto-repeat du navigateur, ou spam
// clavier) peut envoyer bien plus de MOVE par seconde qu'un joueur qui tape
// case par case : sans limite ici, le déplacement n'est cadencé par rien
// côté serveur (seule autorité, voir docs/02-gameplay.md#principe) et le
// canard peut aller beaucoup plus vite que prévu.
const MOVE_COOLDOWN_MS = 120;
// Une bonne partie du temps le bot fonce vers la base ennemie la plus proche,
// le reste du temps il bouge au hasard (parmi les directions non bloquées) :
// juste assez pour scorer occasionnellement sans devenir un adversaire parfait.
const BOT_CHASE_CHANCE = 0.7;

/**
 * Fourni pour une salle de Duel (voir back/src/index.ts) : permet
 * d'enregistrer la partie une fois terminée (voir back/src/db.ts), sans que
 * GameRoom ait besoin de connaître la base de données elle-même.
 */
export interface MatchContext {
  mapName: string;
  onEnd: (result: MatchResult) => void;
}

export class GameRoom {
  private state: GameState;
  private sockets = new Map<string, WebSocket>();
  private botTimer: ReturnType<typeof setInterval> | null = null;
  private spawnOrder: { x: number; y: number }[];
  private lastMoveAt = new Map<string, number>();
  private winScore?: number;
  private matchContext?: MatchContext;
  private ended = false;
  // Identifiant anonyme par joueur (voir front/src/lib/anonId.ts), séparé du
  // Player du moteur de jeu : il ne doit jamais être diffusé aux autres
  // joueurs via broadcastState, seulement utilisé pour enregistrer la partie.
  private anonIds = new Map<string, string>();

  /**
   * `spawnOrder`, si fourni (carte custom depuis l'éditeur, voir
   * back/src/mapWire.ts#parseWireSpawns), fixe l'ordre d'attribution des
   * spawns pour qu'il corresponde à l'ordre des couleurs de l'éditeur :
   * sans ça, findSpawn() scannerait la carte ligne par ligne, dans un ordre
   * sans rapport avec la couleur assignée au joueur (PLAYER_COLORS).
   *
   * `winScore`, si fourni, clôt la partie dès qu'un joueur l'atteint (voir
   * checkForWinner) : envoyé par back/src/index.ts pour le mode Duel
   * uniquement — le mode entraînement (JOIN_TEST) n'a pas de fin de partie.
   *
   * `matchContext`, si fourni, enregistre la partie (back/src/db.ts) une
   * fois qu'elle se termine.
   */
  constructor(
    id: string,
    map: GameMap,
    spawnOrder: { x: number; y: number }[] = [],
    winScore?: number,
    matchContext?: MatchContext,
  ) {
    this.state = { id, map, players: [] };
    this.spawnOrder = spawnOrder;
    this.winScore = winScore;
    this.matchContext = matchContext;
  }

  join(
    playerId: string,
    name: string,
    socket: WebSocket,
    anonId?: string,
    accessory?: string,
  ): void {
    this.sockets.set(playerId, socket);
    this.addPlayer(playerId, name, accessory);
    if (anonId) this.anonIds.set(playerId, anonId);
    this.broadcastState();
  }

  /**
   * Ajoute un adversaire artificiel qui se déplace tout seul (mode
   * entraînement, pour tester une carte custom sans second humain). La
   * plupart du temps il fonce vers la base ennemie la plus proche (voir
   * chooseBotDirection), le reste du temps il bouge au hasard : pas de vraie
   * recherche de chemin (s'il y a un mur entre lui et la base, il peut
   * tourner en rond un moment), volontairement pour rester simple à battre.
   */
  addBot(playerId: string, name: string): void {
    this.addPlayer(playerId, name);
    this.broadcastState();

    this.botTimer = setInterval(() => {
      const direction = this.chooseBotDirection(playerId);
      this.handle(playerId, { type: "MOVE", direction });
    }, BOT_MOVE_INTERVAL_MS);
  }

  leave(playerId: string): void {
    this.sockets.delete(playerId);
    this.state.players = this.state.players.filter((p) => p.id !== playerId);
    this.lastMoveAt.delete(playerId);
    this.anonIds.delete(playerId);
    // Plus aucun humain dans la salle : on arrête le bot pour ne pas laisser
    // un intervalle tourner indéfiniment en arrière-plan sur le serveur.
    if (this.sockets.size === 0) this.stopBot();
    this.broadcastState();
  }

  /**
   * La carte est fixe pour toute la manche : envoyée une fois au nouveau
   * venu (voir back/src/index.ts) plutôt que répétée dans chaque STATE. Sans
   * ça, le client n'a aucun moyen de savoir où sont les murs de la carte
   * réellement jouée (voir front/src/pages/Game.vue).
   */
  getMapMessage(): MapMessage {
    return {
      type: "MAP",
      width: this.state.map.width,
      height: this.state.map.height,
      tiles: this.state.map.tiles,
    };
  }

  handle(playerId: string, message: ClientMessage): void {
    if (this.ended) return; // partie déjà terminée : plus aucun coup n'est accepté

    if (message.type === "MOVE") {
      const now = Date.now();
      const last = this.lastMoveAt.get(playerId) ?? 0;
      if (now - last < MOVE_COOLDOWN_MS) return; // trop tôt : on ignore silencieusement
      this.lastMoveAt.set(playerId, now);

      this.state = applyMove(this.state, playerId, message.direction);
      this.broadcastState();
      this.checkForWinner();
    }
  }

  /**
   * Clôt la partie dès qu'un joueur atteint winScore (voir constructeur) :
   * arrête le bot, enregistre la partie si un matchContext a été fourni, et
   * diffuse un message END plutôt qu'un simple STATE, pour que le client
   * puisse afficher qui a gagné. Sans winScore (mode entraînement), ne fait
   * jamais rien.
   */
  private checkForWinner(): void {
    if (this.winScore === undefined) return;
    const winner = this.state.players.find((p) => p.score >= this.winScore!);
    if (!winner) return;

    this.ended = true;
    this.stopBot();

    if (this.matchContext) {
      this.matchContext.onEnd({
        mapName: this.matchContext.mapName,
        players: this.state.players.map((p) => ({
          anonId: this.anonIds.get(p.id) ?? null,
          name: p.name,
          color: p.color,
          score: p.score,
          isWinner: p.id === winner.id,
        })),
      });
    }

    const message: ServerMessage = { type: "END", winnerId: winner.id };
    const payload = JSON.stringify(message);
    for (const socket of this.sockets.values()) {
      socket.send(payload);
    }
  }

  private addPlayer(playerId: string, name: string, accessory?: string): void {
    const spawn = this.findSpawn();
    this.state.players.push({
      id: playerId,
      name,
      color: PLAYER_COLORS[this.state.players.length % PLAYER_COLORS.length]!,
      accessory: accessory ?? "none",
      x: spawn.x,
      y: spawn.y,
      spawnX: spawn.x,
      spawnY: spawn.y,
      score: 0,
    });
  }

  private stopBot(): void {
    if (this.botTimer) {
      clearInterval(this.botTimer);
      this.botTimer = null;
    }
  }

  /**
   * BOT_CHASE_CHANCE du temps : essaie de se rapprocher de la base ennemie la
   * plus proche (axe le plus déséquilibré en premier). Sinon, ou si les deux
   * directions vers la cible sont bloquées : une direction au hasard parmi
   * celles qui sont réellement jouables (jamais un mur ou un joueur).
   */
  private chooseBotDirection(botId: string): Direction {
    const bot = this.state.players.find((p) => p.id === botId);
    if (!bot) return BOT_DIRECTIONS[0]!;

    if (Math.random() < BOT_CHASE_CHANCE) {
      const target = this.nearestEnemyBase(bot);
      if (target) {
        const chase = this.directionsTowards(bot, target).find((d) => this.isValidBotMove(bot, d));
        if (chase) return chase;
      }
    }

    const valid = BOT_DIRECTIONS.filter((d) => this.isValidBotMove(bot, d));
    if (valid.length > 0) return valid[Math.floor(Math.random() * valid.length)]!;
    // Complètement bloqué (rare) : autant tenter quelque chose, applyMove no-op de toute façon.
    return BOT_DIRECTIONS[Math.floor(Math.random() * BOT_DIRECTIONS.length)]!;
  }

  private nearestEnemyBase(bot: Player): { x: number; y: number } | undefined {
    let nearest: Player | undefined;
    let nearestDistance = Infinity;
    for (const p of this.state.players) {
      if (p.id === bot.id) continue;
      const distance = Math.abs(p.spawnX - bot.x) + Math.abs(p.spawnY - bot.y);
      if (distance < nearestDistance) {
        nearest = p;
        nearestDistance = distance;
      }
    }
    return nearest ? { x: nearest.spawnX, y: nearest.spawnY } : undefined;
  }

  // Ordonne UP/DOWN/LEFT/RIGHT par efficacité pour rejoindre `target` : l'axe
  // le plus éloigné d'abord (pas de vraie recherche de chemin, juste une
  // heuristique gloutonne — un mur sur cet axe et le bot tentera l'autre).
  private directionsTowards(
    from: { x: number; y: number },
    target: { x: number; y: number },
  ): Direction[] {
    const dx = target.x - from.x;
    const dy = target.y - from.y;
    const horizontal: Direction | undefined = dx > 0 ? "RIGHT" : dx < 0 ? "LEFT" : undefined;
    const vertical: Direction | undefined = dy > 0 ? "DOWN" : dy < 0 ? "UP" : undefined;
    const primary = Math.abs(dx) >= Math.abs(dy) ? horizontal : vertical;
    const secondary = primary === horizontal ? vertical : horizontal;
    return [primary, secondary].filter((d): d is Direction => d !== undefined);
  }

  private isValidBotMove(bot: Player, direction: Direction): boolean {
    const { dx, dy } = DIRECTION_DELTA[direction];
    const targetX = bot.x + dx;
    const targetY = bot.y + dy;
    if (!isWalkable(this.state.map, targetX, targetY)) return false;
    return !this.state.players.some((p) => p.id !== bot.id && p.x === targetX && p.y === targetY);
  }

  // Attribue à chaque joueur qui rejoint un Spawn tile distinct, plutôt que
  // de toujours renvoyer le même : sinon deux joueurs (ou un joueur + le bot)
  // démarreraient superposés sur la même case. Utilise l'ordre de couleurs
  // fourni par le client s'il existe (carte custom), sinon retombe sur un
  // simple scan ligne par ligne (carte générée procéduralement).
  private findSpawn(): { x: number; y: number } {
    const spawns = this.spawnOrder.length > 0 ? this.spawnOrder : this.scanSpawns();
    if (spawns.length === 0) return { x: 1, y: 1 };
    return spawns[this.state.players.length % spawns.length]!;
  }

  private scanSpawns(): { x: number; y: number }[] {
    const spawns: { x: number; y: number }[] = [];
    for (let y = 0; y < this.state.map.height; y++) {
      for (let x = 0; x < this.state.map.width; x++) {
        if (this.state.map.tiles[y]?.[x] === Tile.Spawn) spawns.push({ x, y });
      }
    }
    return spawns;
  }

  private broadcastState(): void {
    const players: PlayerState[] = this.state.players;
    const message: ServerMessage = { type: "STATE", players };
    const payload = JSON.stringify(message);
    for (const socket of this.sockets.values()) {
      socket.send(payload);
    }
  }
}

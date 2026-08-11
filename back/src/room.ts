import { applyMove, Tile, type GameMap, type GameState } from "./game-engine/index.js";
import { BOT_LEVELS, chooseBotDirection, DEFAULT_BOT_LEVEL, type BotLevel } from "./bots.js";
import type {
  ClientMessage,
  MapMessage,
  PlayerState,
  ServerMessage,
  WireSpawn,
} from "./protocol.js";
import { PLAYER_COLORS } from "./shared.js";
import type { GameMode } from "./shared.js";
import type { MatchResult } from "./db.js";
import type { WebSocket } from "ws";

// Plancher anti-triche, PAS une vitesse de jeu : marteler la touche est un
// skill assumé (connaître la carte et enchaîner vite doit payer, voir
// docs/02-gameplay.md#rythme-de-déplacement), donc on ne plafonne pas le
// joueur. Un humain culmine autour de 10-14 actions/s ; à 50 ms (20/s) on
// laisse la marge à tout le monde tout en écartant un client scripté qui
// enverrait des centaines de MOVE par seconde. Les vrais ralentissements
// viendront des cases à effet (sable...), en relevant cet intervalle
// localement pour le joueur concerné.
const MOVE_FLOOR_MS = 50;

/**
 * Fourni pour une salle de Duel (voir back/src/index.ts) : permet
 * d'enregistrer la partie une fois terminée (voir back/src/db.ts), sans que
 * GameRoom ait besoin de connaître la base de données elle-même.
 */
export interface MatchContext {
  mapName: string;
  mode: GameMode;
  onEnd: (result: MatchResult) => void;
}

export class GameRoom {
  private state: GameState;
  private sockets = new Map<string, WebSocket>();
  private botTimers: ReturnType<typeof setInterval>[] = [];
  private spawnOrder: WireSpawn[];
  private lastMoveAt = new Map<string, number>();
  private winScore?: number;
  private matchContext?: MatchContext;
  private ended = false;
  // Instant d'entrée du PREMIER joueur, pas de création de la salle : c'est de
  // là que la partie est réellement jouée. Une salle créée puis rejointe une
  // seconde plus tard ne doit pas facturer cette seconde au joueur.
  private startedAt?: number;
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
    spawnOrder: WireSpawn[] = [],
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
    this.startedAt ??= Date.now();
    this.sockets.set(playerId, socket);
    this.addPlayer(playerId, name, accessory);
    if (anonId) this.anonIds.set(playerId, anonId);
    this.broadcastState();
  }

  /**
   * Ajoute un adversaire artificiel du niveau demandé (voir bots.ts). Sa
   * cadence VIENT du niveau : c'est le premier des deux leviers de
   * difficulté, avec la qualité de ses décisions.
   */
  addBot(
    playerId: string,
    name: string,
    level: BotLevel = DEFAULT_BOT_LEVEL,
    anonId?: string,
  ): void {
    this.addPlayer(playerId, name);
    // Un bot a un compte (voir botAccounts.ts) : son identifiant anonyme relie
    // la partie à ce compte, donc ses statistiques et son classement vivent
    // exactement comme ceux d'un joueur.
    if (anonId) this.anonIds.set(playerId, anonId);
    this.broadcastState();

    // Un minuteur PAR bot : en FFA il y en a deux ou trois dans la salle
    // (voir shared.ts#GAME_MODES), et n'en garder qu'un seul laissait les
    // précédents tourner indéfiniment après la fin de la partie — des bots
    // fantômes qui continuent de bouger dans une salle que plus personne ne
    // regarde.
    this.botTimers.push(
      setInterval(() => {
        const direction = chooseBotDirection(this.state, playerId, level, Date.now());
        this.handle(playerId, { type: "MOVE", direction });
      }, BOT_LEVELS[level].intervalMs),
    );
  }

  leave(playerId: string): void {
    this.sockets.delete(playerId);
    this.state.players = this.state.players.filter((p) => p.id !== playerId);
    this.lastMoveAt.delete(playerId);
    this.anonIds.delete(playerId);
    // Plus aucun humain dans la salle : on arrête les bots pour ne pas
    // laisser des intervalles tourner indéfiniment en arrière-plan.
    if (this.sockets.size === 0) this.stopBots();
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
      if (now - last < MOVE_FLOOR_MS) return; // plus vite qu'humainement possible : ignoré
      this.lastMoveAt.set(playerId, now);

      this.state = applyMove(this.state, playerId, message.direction, now);
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
    this.stopBots();

    if (this.matchContext) {
      this.matchContext.onEnd({
        mapName: this.matchContext.mapName,
        mode: this.matchContext.mode,
        durationMs: this.startedAt === undefined ? undefined : Date.now() - this.startedAt,
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
    // La couleur vient du SPAWN, pas du rang d'arrivée : une carte qui
    // n'utilise pas toutes les couleurs (spawn-0/2/3, par exemple) ferait
    // sinon apparaître un canard cyan sur une case ambre — la case, le canard
    // et son halo de territoire ne s'accorderaient plus (voir
    // front/src/lib/mapEditor.ts#toWireSpawns). Sans indice de couleur (carte
    // procédurale, dont les Spawn sont anonymes), le rang reste le seul
    // repère disponible.
    const colorIndex = spawn.color ?? this.state.players.length;
    this.state.players.push({
      id: playerId,
      name,
      color: PLAYER_COLORS[colorIndex % PLAYER_COLORS.length]!,
      accessory: accessory ?? "none",
      x: spawn.x,
      y: spawn.y,
      spawnX: spawn.x,
      spawnY: spawn.y,
      score: 0,
      immuneUntil: 0,
    });
  }

  private stopBots(): void {
    for (const timer of this.botTimers) clearInterval(timer);
    this.botTimers = [];
  }

  // Attribue à chaque joueur qui rejoint un Spawn tile distinct, plutôt que
  // de toujours renvoyer le même : sinon deux joueurs (ou un joueur + le bot)
  // démarreraient superposés sur la même case. Utilise l'ordre de couleurs
  // fourni par le client s'il existe (carte custom), sinon retombe sur un
  // simple scan ligne par ligne (carte générée procéduralement).
  private findSpawn(): { x: number; y: number; color?: number } {
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
    const now = Date.now();
    const players: PlayerState[] = this.state.players.map((p) => ({
      ...p,
      immuneForMs: Math.max(0, p.immuneUntil - now),
    }));
    const message: ServerMessage = { type: "STATE", players };
    const payload = JSON.stringify(message);
    for (const socket of this.sockets.values()) {
      socket.send(payload);
    }
  }
}

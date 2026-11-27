import {
  applyMove,
  DIRECTION_DELTA,
  Tile,
  wouldTag,
  type GameMap,
  type GameState,
} from "./game-engine/index.js";
import { BOT_LEVELS, chooseBotDirection, DEFAULT_BOT_LEVEL, type BotLevel } from "./bots.js";
import type {
  ClientMessage,
  Direction,
  MapMessage,
  PlayerState,
  ServerMessage,
  WireSpawn,
} from "./protocol.js";
import { PLAYER_COLORS, STEP_MS } from "./shared.js";
import { randomBotOutfit } from "./catalog.js";
import type { GameMode } from "./shared.js";
import type { MatchResult } from "./db.js";
import type { WebSocket } from "ws";

/**
 * Fourni pour une salle de Duel (voir back/src/index.ts) : permet
 * d'enregistrer la partie une fois terminée (voir back/src/db.ts), sans que
 * GameRoom ait besoin de connaître la base de données elle-même.
 */
export interface MatchContext {
  mapName: string;
  mode: GameMode;
  onEnd: (result: MatchResult) => void;
  /**
   * Récompense du vainqueur s'il a un compte (partie publique seulement) : le message renvoyé lui est
   * envoyé, à lui seul, après END.
   */
  reward?: (winner: { accountId: string; moves: number }) => Promise<ServerMessage | undefined>;
}

/**
 * Chance de fuir. Quand un coup toucherait un adversaire, la salle attend ce délai avant de le jouer :
 * si la victime part dans l'intervalle, elle s'échappe et l'attaquant entre simplement sur la case
 * libérée. Deux joueurs qui appuient presque en même temps ne se départagent plus à l'ordre
 * d'arrivée des messages : on ne pénalise pas celui qui fuit. Assez court pour ne pas se sentir.
 */
export const FLEE_MS = 90;

export class GameRoom {
  private state: GameState;
  private sockets = new Map<string, WebSocket>();
  private botTimers: ReturnType<typeof setInterval>[] = [];
  private spawnOrder: WireSpawn[];
  private lastMoveAt = new Map<string, number>();
  /** Compte de chaque joueur connecté (absent pour un invité ou un bot). */
  private accountIds = new Map<string, string>();
  /** Pas réellement joués par chacun : en dessous d'un seuil, on n'a pas vraiment joué. */
  private moves = new Map<string, number>();
  /** Le pas demandé pendant une glissade : il part dès qu'elle finit. Un seul, le dernier. */
  private pending = new Map<
    string,
    { direction: Direction; timer: ReturnType<typeof setTimeout> }
  >();
  /** Coups qui toucheraient quelqu'un, retenus le temps de lui laisser fuir (FLEE_MS). */
  private holds = new Map<
    string,
    {
      direction: Direction;
      victimId: string;
      timer: ReturnType<typeof setTimeout>;
      /** Le pas demandé pendant la retenue : il suit, au rythme normal. */
      then?: Direction;
    }
  >();
  private winScore?: number;
  private matchContext?: MatchContext;
  private ended = false;
  // Instant du DÉPART de la partie (voir start()), pas de l'entrée du premier
  // joueur : depuis les salles partagées (voir matchmaking.ts), un joueur peut
  // patienter jusqu'à dix secondes avant que la partie parte. Facturer cette
  // attente à la durée de la partie enregistrée fausserait toutes les
  // statistiques d'un joueur qui a le malheur d'arriver le premier.
  private startedAt?: number;
  // Nombre de places assises, donc de joueurs à réunir avant le départ. Vaut
  // le nombre de bases de la carte : c'est la carte qui décide combien on peut
  // être, pas l'inverse (voir index.ts#pickRandomOfficialMap).
  private readonly capacity: number;
  // L'attente est une affaire de MATCHMAKING, pas de salle : une salle joue
  // dès qu'on la crée, et seul openForWaiting() la met en attente de joueurs.
  // C'est ce qui laisse l'entraînement (JOIN_TEST) — qui n'attend personne —
  // ignorer complètement ce mécanisme.
  private waiting = false;
  // Échéance de départ au plus tard, transmise au client pour qu'il affiche
  // l'attente (voir protocol.ts#WaitingMessage). Absente en entraînement, qui
  // part immédiatement.
  private waitingUntil?: number;
  // Fin du décompte 3-2-1 : avant cet instant, aucun coup n'est accepté, ni des
  // joueurs ni des bots.
  private playableAt = 0;
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
   *
   * `capacity`, si fourni, fixe le nombre de places de la salle — c'est lui
   * qui dit quand elle est pleine, donc quand la partie peut partir sans
   * attendre (voir matchmaking.ts). Par défaut, le nombre de spawns connus.
   */
  constructor(
    id: string,
    map: GameMap,
    spawnOrder: WireSpawn[] = [],
    winScore?: number,
    matchContext?: MatchContext,
    capacity?: number,
  ) {
    this.state = { id, map, players: [] };
    this.spawnOrder = spawnOrder;
    this.winScore = winScore;
    this.matchContext = matchContext;
    this.capacity = capacity ?? (spawnOrder.length || Number.POSITIVE_INFINITY);
  }

  get id(): string {
    return this.state.id;
  }

  get isStarted(): boolean {
    return !this.waiting;
  }

  /** Plus une seule place : la partie n'a plus de raison d'attendre. */
  get isFull(): boolean {
    return this.state.players.length >= this.capacity;
  }

  /** Places encore vides, à compléter par des bots au départ (voir index.ts). */
  get freeSeats(): number {
    return Number.isFinite(this.capacity)
      ? Math.max(0, this.capacity - this.state.players.length)
      : 0;
  }

  /**
   * Compte les joueurs réellement connectés — un bot n'a pas de socket. Sert à
   * décider si une salle a encore une raison d'exister : une salle où il ne
   * reste que des bots ne regarde plus personne.
   */
  get humanCount(): number {
    return this.sockets.size;
  }

  join(
    playerId: string,
    name: string,
    socket: WebSocket,
    anonId?: string,
    outfit?: string[],
    accountId?: string,
  ): void {
    this.startedAt ??= Date.now();
    this.sockets.set(playerId, socket);
    if (accountId) this.accountIds.set(playerId, accountId);
    this.addPlayer(playerId, name, outfit);
    if (anonId) this.anonIds.set(playerId, anonId);
    this.broadcastState();
  }

  /**
   * Met la salle en attente de joueurs jusqu'à `deadlineAt` (voir
   * matchmaking.ts) : elle cesse d'accepter les coups et annonce l'attente à
   * chacun de ses occupants. À appeler AVANT le premier entrant, pour qu'il
   * reçoive une échéance plutôt qu'un compte à rebours sans chiffre.
   */
  openForWaiting(deadlineAt: number): void {
    this.waiting = true;
    this.waitingUntil = deadlineAt;
    this.broadcastState();
  }

  /**
   * Donne le départ : les coups sont acceptés, et le chrono de la partie
   * enregistrée repart de zéro — les secondes passées à attendre des
   * adversaires ne sont pas de la partie jouée.
   *
   * Sans effet sur une salle qui n'attendait pas : une salle remplie AVANT la
   * fin du délai part immédiatement, et le délai qui expire ensuite ne doit
   * pas remettre son chrono à zéro en pleine partie.
   */
  start(countdownMs = 0): void {
    if (!this.waiting) return;
    this.waiting = false;
    this.waitingUntil = undefined;
    this.startCountdown(countdownMs);
  }

  /**
   * Montre le plateau et retient tout le monde `countdownMs` : chacun a le temps
   * de repérer la carte et son canard. Le chrono de la partie part à la fin.
   */
  startCountdown(countdownMs: number): void {
    this.playableAt = Date.now() + countdownMs;
    this.startedAt = this.playableAt;
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
    outfit?: string[],
  ): void {
    // Un bot sans tenue à lui en reçoit une pour la partie, à la mesure de son niveau.
    this.addPlayer(playerId, name, outfit?.length ? outfit : randomBotOutfit(level));
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
    this.accountIds.delete(playerId);
    this.forget(playerId);
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
    if (this.waiting) return; // partie pas encore partie : on attend encore des joueurs
    if (this.ended) return; // partie déjà terminée : plus aucun coup n'est accepté
    if (Date.now() < this.playableAt) return; // décompte en cours

    if (message.type === "MOVE") this.pace(playerId, message.direction);
  }

  /** Un pas à la fois, le temps d'une glissade entière (STEP_MS). */
  private pace(playerId: string, direction: Direction): void {
    const held = this.holds.get(playerId);
    if (held) {
      held.then = direction;
      return;
    }
    const queued = this.pending.get(playerId);
    if (queued) {
      queued.direction = direction;
      return;
    }
    const wait = (this.lastMoveAt.get(playerId) ?? -STEP_MS) + STEP_MS - Date.now();
    if (wait <= 0) return this.step(playerId, direction);

    const next = {
      direction,
      timer: setTimeout(() => {
        this.pending.delete(playerId);
        this.step(playerId, next.direction);
      }, wait),
    };
    this.pending.set(playerId, next);
  }

  private step(playerId: string, direction: Direction): void {
    if (this.ended) return;
    const now = Date.now();

    // Visé par un coup retenu, et ce pas fonce sur l'attaquant : il était là le premier, il touche.
    for (const [attackerId, hold] of this.holds) {
      if (hold.victimId !== playerId || !this.movesOnto(playerId, direction, attackerId)) continue;
      const immuneBefore = this.immuneUntil(playerId);
      this.resolveHold(attackerId);
      if (this.immuneUntil(playerId) !== immuneBefore) return; // renvoyé chez lui : son pas tombe
    }

    const victim = wouldTag(this.state, playerId, direction, now);
    if (victim) {
      this.lastMoveAt.set(playerId, now);
      this.holds.set(playerId, {
        direction,
        victimId: victim.id,
        timer: setTimeout(() => this.resolveHold(playerId), FLEE_MS),
      });
      return;
    }
    this.apply(playerId, direction, now);
  }

  private movesOnto(playerId: string, direction: Direction, otherId: string): boolean {
    const me = this.state.players.find((p) => p.id === playerId);
    const other = this.state.players.find((p) => p.id === otherId);
    const delta = DIRECTION_DELTA[direction];
    return !!me && !!other && !!delta && me.x + delta.dx === other.x && me.y + delta.dy === other.y;
  }

  private immuneUntil(playerId: string): number | undefined {
    return this.state.players.find((p) => p.id === playerId)?.immuneUntil;
  }

  /** Fin de la chance de fuir : le coup retenu est joué sur l'état du moment. */
  private resolveHold(playerId: string): void {
    const hold = this.holds.get(playerId);
    if (!hold) return;
    clearTimeout(hold.timer);
    this.holds.delete(playerId);
    this.apply(playerId, hold.direction, Date.now());
    if (hold.then && !this.ended) this.pace(playerId, hold.then);
  }

  private apply(playerId: string, direction: Direction, now: number): void {
    if (this.ended) return;
    this.lastMoveAt.set(playerId, now);
    this.moves.set(playerId, (this.moves.get(playerId) ?? 0) + 1);
    const before = new Map(this.state.players.map((p) => [p.id, p.immuneUntil]));
    this.state = applyMove(this.state, playerId, direction, now);
    // Renvoyé à sa base (touché, ou point marqué) : le pas demandé d'avant ne vaut plus.
    for (const player of this.state.players) {
      if (player.immuneUntil !== before.get(player.id)) this.forget(player.id);
    }
    this.broadcastState();
    this.checkForWinner();
  }

  private forget(playerId: string): void {
    clearTimeout(this.pending.get(playerId)?.timer);
    this.pending.delete(playerId);
    clearTimeout(this.holds.get(playerId)?.timer);
    this.holds.delete(playerId);
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
    for (const id of [...this.pending.keys(), ...this.holds.keys()]) this.forget(id);

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

    const accountId = this.accountIds.get(winner.id);
    if (accountId && this.matchContext?.reward) {
      const moves = this.moves.get(winner.id) ?? 0;
      this.matchContext
        .reward({ accountId, moves })
        .then((reward) => {
          if (reward) this.sockets.get(winner.id)?.send(JSON.stringify(reward));
        })
        .catch((error: unknown) => console.error("Échec de la récompense :", error));
    }
  }

  private addPlayer(playerId: string, name: string, outfit: string[] = []): void {
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
      outfit,
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

  /**
   * Tant que la partie n'est pas partie, la salle diffuse WAITING plutôt que
   * STATE : le client doit pouvoir DIRE qu'on attend des adversaires, au lieu
   * d'afficher un plateau jouable sur lequel les touches ne répondent pas
   * (voir handle()). Une fois partie, plus jamais de WAITING.
   */
  private broadcastState(): void {
    const now = Date.now();
    const players: PlayerState[] = this.state.players.map((p) => ({
      ...p,
      immuneForMs: Math.max(0, p.immuneUntil - now),
    }));
    const message: ServerMessage = this.waiting
      ? {
          type: "WAITING",
          players,
          capacity: Number.isFinite(this.capacity) ? this.capacity : players.length,
          // Une DURÉE, pas une date : l'horloge du navigateur n'est pas celle
          // du serveur, même raison que PlayerState#immuneForMs.
          startsInMs: Math.max(0, (this.waitingUntil ?? now) - now),
        }
      : { type: "STATE", players, countdownMs: Math.max(0, this.playableAt - now) };
    const payload = JSON.stringify(message);
    for (const socket of this.sockets.values()) {
      socket.send(payload);
    }
  }
}

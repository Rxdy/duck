/**
 * Les salons des parties personnalisées : on s'y retrouve entre comptes, par
 * invitation ou avec le code du salon, on complète avec des bots, puis l'hôte
 * lance. Ces parties ne sont JAMAIS enregistrées ni classées : sans quoi des
 * amis pourraient se laisser gagner pour monter au classement.
 *
 * Les salons vivent en mémoire : un redémarrage du serveur les ferme. Ce module
 * ne connaît ni le réseau ni la base ; la salle de jeu lui est fournie.
 */
import { randomBytes } from "node:crypto";
import { BOT_LEVELS, DEFAULT_BOT_LEVEL, type BotLevel } from "./bots.js";
import type { LobbyState, ServerMessage } from "./protocol.js";
import { playerCountFor, type GameMode } from "./shared.js";

export interface LobbyPlayer {
  /** Identité de la connexion, aussi celle du canard en partie. */
  playerId: string;
  accountId: string;
  username: string;
  tag: string;
  outfit: string[];
  send(message: ServerMessage): void;
}

/** Une partie lancée depuis un salon. */
export interface LobbyGame {
  leave(playerId: string): void;
}

export interface LobbyGameOptions {
  mode: GameMode;
  players: LobbyPlayer[];
  bots: number;
  botLevel: BotLevel;
  /** À appeler quand la partie se termine : le salon rouvre. */
  onEnd: () => void;
}

/** `undefined` : impossible de lancer (aucune carte pour ce mode). */
export type StartGame = (options: LobbyGameOptions) => LobbyGame | undefined;

interface Lobby {
  code: string;
  mode: GameMode;
  botLevel: BotLevel;
  bots: number;
  /** Le premier est l'hôte. */
  players: LobbyPlayer[];
  /** Comptes invités qui ne sont pas encore entrés, avec leur code joueur. */
  invited: Map<string, string>;
  game?: LobbyGame;
}

export interface LobbyInvite {
  code: string;
  mode: GameMode;
  from: string;
}

const MAX_INVITES = 20;

export class LobbyRegistry {
  private lobbies = new Map<string, Lobby>();

  constructor(private readonly startGame: StartGame) {}

  create(player: LobbyPlayer, mode: GameMode): string {
    this.leave(player.playerId);
    let code: string;
    do code = randomBytes(3).toString("hex").toUpperCase();
    while (this.lobbies.has(code));
    const lobby: Lobby = {
      code,
      mode,
      botLevel: DEFAULT_BOT_LEVEL,
      bots: 0,
      players: [player],
      invited: new Map(),
    };
    this.lobbies.set(code, lobby);
    this.broadcast(lobby);
    return code;
  }

  /** `undefined` en cas de succès, sinon la raison à dire au joueur. */
  join(player: LobbyPlayer, code: string): string | undefined {
    const lobby = this.lobbies.get(code.toUpperCase());
    if (!lobby) return "Ce salon n'existe plus.";
    if (lobby.players.some((p) => p.playerId === player.playerId)) {
      this.broadcast(lobby);
      return undefined;
    }
    // Le même compte depuis un autre onglet reprend sa place au lieu d'en prendre deux.
    const twin = lobby.players.find((p) => p.accountId === player.accountId);
    if (!twin && lobby.game) return "La partie est déjà lancée.";
    if (!twin && lobby.players.length >= playerCountFor(lobby.mode)) return "Le salon est complet.";

    this.leave(player.playerId);
    if (twin) {
      lobby.game?.leave(twin.playerId);
      lobby.players[lobby.players.indexOf(twin)] = player;
      twin.send({ type: "LOBBY_CLOSED", reason: "Salon ouvert ailleurs avec ton compte." });
    } else {
      lobby.players.push(player);
    }
    lobby.invited.delete(player.accountId);
    // Un humain prend la place d'un bot.
    lobby.bots = Math.min(lobby.bots, playerCountFor(lobby.mode) - lobby.players.length);
    this.broadcast(lobby);
    return undefined;
  }

  leave(playerId: string): void {
    const lobby = this.lobbyOf(playerId);
    if (!lobby) return;
    lobby.game?.leave(playerId);
    lobby.players = lobby.players.filter((p) => p.playerId !== playerId);
    if (lobby.players.length === 0) {
      this.lobbies.delete(lobby.code);
      return;
    }
    // Plus personne à affronter : la partie n'a plus lieu d'être.
    if (lobby.game && lobby.players.length + lobby.bots < 2) lobby.game = undefined;
    this.broadcast(lobby);
  }

  /** Réglages réservés à l'hôte, tant que la partie n'est pas lancée. */
  configure(
    playerId: string,
    settings: { mode?: GameMode; bots?: number; botLevel?: BotLevel },
  ): void {
    const lobby = this.hostedBy(playerId);
    if (!lobby || lobby.game) return;
    const mode = settings.mode ?? lobby.mode;
    // On ne change pas pour un mode trop petit pour les joueurs présents.
    if (playerCountFor(mode) >= lobby.players.length) lobby.mode = mode;
    lobby.botLevel = settings.botLevel ?? lobby.botLevel;
    const free = playerCountFor(lobby.mode) - lobby.players.length;
    lobby.bots = Math.max(0, Math.min(free, Math.trunc(settings.bots ?? lobby.bots)));
    this.broadcast(lobby);
  }

  /** L'appelant a déjà vérifié qu'il s'agit bien d'un ami. */
  invite(playerId: string, friend: { accountId: string; tag: string }): void {
    const lobby = this.lobbyOf(playerId);
    if (!lobby || lobby.invited.size >= MAX_INVITES) return;
    if (lobby.players.some((p) => p.accountId === friend.accountId)) return;
    lobby.invited.set(friend.accountId, friend.tag);
    this.broadcast(lobby);
  }

  /** Les salons ouverts où ce compte est attendu. */
  invitesFor(accountId: string): LobbyInvite[] {
    return [...this.lobbies.values()]
      .filter(
        (l) => !l.game && l.invited.has(accountId) && l.players.length < playerCountFor(l.mode),
      )
      .map((l) => ({ code: l.code, mode: l.mode, from: l.players[0]!.username }));
  }

  decline(accountId: string, code: string): void {
    const lobby = this.lobbies.get(code.toUpperCase());
    if (lobby?.invited.delete(accountId)) this.broadcast(lobby);
  }

  /** L'hôte lance, une fois chaque place prise par un joueur ou un bot. */
  start(playerId: string): void {
    const lobby = this.hostedBy(playerId);
    if (!lobby || lobby.game) return;
    if (lobby.players.length + lobby.bots !== playerCountFor(lobby.mode)) return;

    let over = false;
    const game = this.startGame({
      mode: lobby.mode,
      players: [...lobby.players],
      bots: lobby.bots,
      botLevel: lobby.botLevel,
      onEnd: () => {
        over = true;
        lobby.game = undefined;
        this.broadcast(lobby);
      },
    });
    if (!game) {
      lobby.players[0]!.send({ type: "ERROR", message: "Aucune carte disponible pour ce mode." });
      return;
    }
    if (!over) lobby.game = game;
    this.broadcast(lobby);
  }

  private lobbyOf(playerId: string): Lobby | undefined {
    return [...this.lobbies.values()].find((l) => l.players.some((p) => p.playerId === playerId));
  }

  private hostedBy(playerId: string): Lobby | undefined {
    const lobby = this.lobbyOf(playerId);
    return lobby?.players[0]!.playerId === playerId ? lobby : undefined;
  }

  private broadcast(lobby: Lobby): void {
    const state: LobbyState = {
      code: lobby.code,
      mode: lobby.mode,
      capacity: playerCountFor(lobby.mode),
      bots: lobby.bots,
      botLevel: lobby.botLevel,
      botLabel: BOT_LEVELS[lobby.botLevel].label,
      playing: lobby.game !== undefined,
      players: lobby.players.map(({ username, tag }) => ({ username, tag })),
      invited: [...lobby.invited.values()],
    };
    for (const player of lobby.players) {
      player.send({ type: "LOBBY", lobby: state, you: player.tag });
    }
  }
}

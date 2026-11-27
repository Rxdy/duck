/**
 * La connexion d'une partie en ligne. Elle vit hors de toute page : on lance la
 * recherche, on se promène (accueil, options...) et la partie s'ouvre quand elle
 * démarre. Une seule à la fois. La même connexion sert au salon d'une partie
 * personnalisée, puis aux parties qu'on y joue.
 */
import type {
  BotLevel,
  ClientMessage,
  Direction,
  GameMode,
  LobbyMessage,
  ServerMessage,
} from "../types.js";
import { useGameStore } from "../store/gameStore.js";
import { useSettingsStore } from "../store/settingsStore.js";
import { useAuthStore } from "../store/authStore.js";
import { useLobbyStore } from "../store/lobbyStore.js";
import { playArcadeStartJingle, playScoreSfx, startAmbientLoop, stopAmbientLoop } from "./audio.js";
import { getOrCreateAnonId } from "./anonId.js";
import { WS_URL } from "./serverUrl.js";

let socket: WebSocket | null = null;

export function searchMatch(mode: GameMode, botLevel?: BotLevel): void {
  const store = useGameStore();
  const auth = useAuthStore();

  leaveMatch();
  store.setQueue({ mode, botLevel });

  const current = new WebSocket(WS_URL);
  socket = current;

  current.addEventListener("open", () => {
    send({
      type: "JOIN",
      gameId: "lobby",
      // Pseudo du compte si connecté, sinon un nom générique.
      name: auth.session?.username ?? "Joueur",
      anonId: getOrCreateAnonId(),
      // Si connecté : permet au serveur de retrouver la tenue du compte.
      token: auth.session?.token,
      mode,
      botLevel,
    });
  });

  current.addEventListener("message", (event) => {
    if (socket !== current) return; // réponse d'une file déjà quittée
    handleGameMessage(JSON.parse(event.data) as ServerMessage);
  });

  // Coupure pendant la recherche : le dire plutôt que de chercher dans le vide.
  current.addEventListener("close", () => {
    if (socket === current && store.playableAt === null) {
      store.setError("Connexion au serveur perdue.");
    }
  });
}

/** Quitte la file d'attente ou la partie en cours. Fermer la connexion suffit au serveur. */
export function leaveMatch(): void {
  const current = socket;
  socket = null;
  current?.close();
  resetGame();
  useLobbyStore().clear();
}

/** Range le plateau sans couper la connexion : on reste dans le salon. */
export function resetGame(): void {
  stopAmbientLoop();
  useGameStore().reset();
}

/** Ouvre un salon, ou rejoint celui de ce code. Quitte ce qu'on faisait avant. */
export function enterLobby(entry: { mode: GameMode } | { code: string }): void {
  const lobbyStore = useLobbyStore();
  const token = useAuthStore().session?.token;
  leaveMatch();
  if (!token) return;

  const current = new WebSocket(WS_URL);
  socket = current;

  current.addEventListener("open", () => {
    send(
      "code" in entry
        ? { type: "LOBBY_JOIN", token, code: entry.code }
        : { type: "LOBBY_CREATE", token, mode: entry.mode },
    );
  });

  current.addEventListener("message", (event) => {
    if (socket !== current) return;
    const message = JSON.parse(event.data) as ServerMessage;
    if (message.type === "LOBBY") {
      lobbyStore.lobby = message.lobby;
      lobbyStore.you = message.you;
      lobbyStore.notice = "";
    } else if (message.type === "LOBBY_CLOSED") {
      leaveMatch();
      lobbyStore.notice = message.reason;
    } else {
      // Une nouvelle partie du salon : on efface le plateau de la précédente.
      if (message.type === "MAP") {
        resetGame();
        useGameStore().setQueue({ mode: lobbyStore.lobby!.mode });
      }
      handleGameMessage(message);
    }
  });

  current.addEventListener("close", () => {
    if (socket !== current) return;
    leaveMatch();
    lobbyStore.notice = "Connexion au serveur perdue.";
  });
}

export function sendLobby(message: LobbyMessage): void {
  send(message);
}

export function sendMove(direction: Direction): void {
  send({ type: "MOVE", direction });
}

function send(message: ClientMessage): void {
  if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
}

function handleGameMessage(message: ServerMessage): void {
  const store = useGameStore();
  const settings = useSettingsStore();
  if (message.type === "MAP") {
    store.setMap({ width: message.width, height: message.height, tiles: message.tiles });
    store.setPlayerId(message.you ?? null);
  } else if (message.type === "ERROR") {
    store.setError(message.message);
  } else if (message.type === "END") {
    store.setWinner(message.winnerId);
  } else if (message.type === "CHEST") {
    store.setChest(message);
  } else if (message.type === "WAITING") {
    store.setWaiting({ capacity: message.capacity, startsInMs: message.startsInMs });
    store.setPlayers(message.players);
  } else if (message.type === "STATE") {
    // Premier STATE : la salle a fini de réunir ses joueurs, la partie part.
    if (store.playableAt === null) {
      store.setWaiting(null);
      store.setPlayableAt(Date.now() + (message.countdownMs ?? 0));
      playArcadeStartJingle(settings.musicVolume);
      startAmbientLoop(settings.musicVolume);
    }
    // Comparé AVANT setPlayers pour détecter un score qui vient d'augmenter.
    const previous = new Map(store.players.map((p) => [p.id, p.score]));
    const scored = message.players.some((p) => p.score > (previous.get(p.id) ?? 0));
    store.setPlayers(message.players);
    if (scored) playScoreSfx(settings.sfxVolume);
  }
}

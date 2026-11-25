/**
 * La connexion d'une partie en ligne. Elle vit hors de toute page : on lance la
 * recherche, on se promène (accueil, options...) et la partie s'ouvre quand elle
 * démarre. Une seule à la fois.
 */
import type { BotLevel, ClientMessage, Direction, GameMode, ServerMessage } from "../types.js";
import { useGameStore } from "../store/gameStore.js";
import { useSettingsStore } from "../store/settingsStore.js";
import { useAuthStore } from "../store/authStore.js";
import { playArcadeStartJingle, playScoreSfx, startAmbientLoop, stopAmbientLoop } from "./audio.js";
import { getOrCreateAnonId } from "./anonId.js";
import { WS_URL } from "./serverUrl.js";

let socket: WebSocket | null = null;

export function searchMatch(mode: GameMode, botLevel?: BotLevel): void {
  const store = useGameStore();
  const settings = useSettingsStore();
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
      // Si connecté : permet au serveur de retrouver le skin équipé.
      token: auth.session?.token,
      mode,
      botLevel,
    });
  });

  current.addEventListener("message", (event) => {
    if (socket !== current) return; // réponse d'une file déjà quittée
    const message = JSON.parse(event.data) as ServerMessage;
    if (message.type === "MAP") {
      store.setMap({ width: message.width, height: message.height, tiles: message.tiles });
      store.setPlayerId(message.you ?? null);
    } else if (message.type === "ERROR") {
      store.setError(message.message);
    } else if (message.type === "END") {
      store.setWinner(message.winnerId);
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
  stopAmbientLoop();
  useGameStore().reset();
}

export function sendMove(direction: Direction): void {
  send({ type: "MOVE", direction });
}

function send(message: ClientMessage): void {
  if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
}

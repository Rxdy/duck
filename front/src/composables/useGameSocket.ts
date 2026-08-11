import { onMounted, onUnmounted } from "vue";
import type { BotLevel, ClientMessage, Direction, GameMode, ServerMessage } from "../types.js";
import { useGameStore } from "../store/gameStore.js";
import { useSettingsStore } from "../store/settingsStore.js";
import {
  playArcadeStartJingle,
  playScoreSfx,
  startAmbientLoop,
  stopAmbientLoop,
} from "../lib/audio.js";
import { getOrCreateAnonId } from "../lib/anonId.js";
import { useAuthStore } from "../store/authStore.js";

const SERVER_URL = import.meta.env.VITE_SERVER_WS_URL ?? "ws://localhost:8080";

export function useGameSocket(
  gameId: string,
  playerName: string,
  mode: GameMode,
  botLevel?: BotLevel,
) {
  const store = useGameStore();
  const settings = useSettingsStore();
  const auth = useAuthStore();
  let socket: WebSocket | null = null;

  function connect() {
    socket = new WebSocket(SERVER_URL);

    socket.addEventListener("open", () => {
      send(socket!, {
        type: "JOIN",
        gameId,
        name: playerName,
        anonId: getOrCreateAnonId(),
        // Si connecté : permet au serveur de retrouver le skin équipé pour
        // l'afficher sur le canard (voir back/src/index.ts#resolveAccessory).
        token: auth.session?.token,
        mode,
        botLevel,
      });
      playArcadeStartJingle(settings.musicVolume);
      startAmbientLoop(settings.musicVolume);
    });

    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data) as ServerMessage;
      if (message.type === "MAP") {
        store.setMap({ width: message.width, height: message.height, tiles: message.tiles });
        return;
      }
      if (message.type === "ERROR") {
        store.setError(message.message);
        return;
      }
      if (message.type === "END") {
        store.setWinner(message.winnerId);
        return;
      }
      if (message.type === "STATE") {
        // Comparé AVANT setPlayers (qui écrase store.players) pour détecter
        // un score qui vient d'augmenter et jouer le bip correspondant.
        const previousScores = new Map(store.players.map((p) => [p.id, p.score]));
        const anyoneScored = message.players.some((p) => p.score > (previousScores.get(p.id) ?? 0));
        store.setPlayers(message.players);
        if (anyoneScored) playScoreSfx(settings.sfxVolume);
      }
    });
  }

  onMounted(connect);

  onUnmounted(() => {
    socket?.close();
    stopAmbientLoop();
  });

  function move(direction: Direction) {
    if (socket) send(socket, { type: "MOVE", direction });
  }

  /**
   * Relance une partie dans le même mode : le serveur crée une salle neuve à
   * chaque JOIN (voir back/src/index.ts), donc il faut vraiment refermer la
   * connexion — la rouvrir est le seul moyen d'obtenir une nouvelle salle,
   * avec sa carte tirée au sort et ses bots.
   */
  function restart() {
    socket?.close();
    store.reset();
    connect();
  }

  return { move, restart };
}

function send(socket: WebSocket, message: ClientMessage) {
  socket.send(JSON.stringify(message));
}

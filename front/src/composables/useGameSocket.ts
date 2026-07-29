import { onMounted, onUnmounted } from "vue";
import type { ClientMessage, Direction, ServerMessage } from "../types.js";
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

export function useGameSocket(gameId: string, playerName: string) {
  const store = useGameStore();
  const settings = useSettingsStore();
  const auth = useAuthStore();
  let socket: WebSocket | null = null;

  onMounted(() => {
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
  });

  onUnmounted(() => {
    socket?.close();
    stopAmbientLoop();
  });

  function move(direction: Direction) {
    if (socket) send(socket, { type: "MOVE", direction });
  }

  return { move };
}

function send(socket: WebSocket, message: ClientMessage) {
  socket.send(JSON.stringify(message));
}

import { onMounted, onUnmounted } from "vue";
import type { ClientMessage, Direction, ServerMessage } from "../types.js";
import type { EditorMap } from "../lib/mapEditor.js";
import { toWireSpawns, toWireTiles } from "../lib/mapEditor.js";
import { useGameStore } from "../store/gameStore.js";
import { useSettingsStore } from "../store/settingsStore.js";
import {
  playArcadeStartJingle,
  playScoreSfx,
  startAmbientLoop,
  stopAmbientLoop,
} from "../lib/audio.js";
import { WS_URL } from "../lib/serverUrl.js";
import { loadSession } from "../lib/session.js";

/**
 * Comme useGameSocket, mais rejoint une partie d'entraînement solo sur une
 * carte custom (JOIN_TEST) au lieu d'une carte générée (JOIN).
 */
export function useTestGameSocket(map: EditorMap) {
  const store = useGameStore();
  const settings = useSettingsStore();
  let socket: WebSocket | null = null;
  store.reset();

  onMounted(() => {
    socket = new WebSocket(WS_URL);

    socket.addEventListener("open", () => {
      send(socket!, {
        type: "JOIN_TEST",
        token: loadSession()?.token,
        map: {
          width: map.width,
          height: map.height,
          tiles: toWireTiles(map),
          spawns: toWireSpawns(map),
        },
      });
      playArcadeStartJingle(settings.musicVolume);
      startAmbientLoop(settings.musicVolume);
    });

    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data) as ServerMessage;
      if (message.type === "STATE") {
        // Comparé AVANT setPlayers (qui écrase store.players) pour détecter
        // un score qui vient d'augmenter et jouer le bip correspondant.
        const previousScores = new Map(store.players.map((p) => [p.id, p.score]));
        const anyoneScored = message.players.some((p) => p.score > (previousScores.get(p.id) ?? 0));
        store.setPlayers(message.players);
        // Le premier état est reçu pendant le décompte, les suivants après.
        if (message.countdownMs) store.setPlayableAt(Date.now() + message.countdownMs);
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

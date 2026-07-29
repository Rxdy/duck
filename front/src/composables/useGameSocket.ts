import { onMounted, onUnmounted } from "vue";
import type { ClientMessage, Direction, ServerMessage } from "../types.js";
import { useGameStore } from "../store/gameStore.js";

const SERVER_URL = import.meta.env.VITE_SERVER_WS_URL ?? "ws://localhost:8080";

export function useGameSocket(gameId: string, playerName: string) {
  const store = useGameStore();
  let socket: WebSocket | null = null;

  onMounted(() => {
    socket = new WebSocket(SERVER_URL);

    socket.addEventListener("open", () => {
      send(socket!, { type: "JOIN", gameId, name: playerName });
    });

    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data) as ServerMessage;
      if (message.type === "STATE") {
        store.setPlayers(message.players);
      }
    });
  });

  onUnmounted(() => {
    socket?.close();
  });

  function move(direction: Direction) {
    if (socket) send(socket, { type: "MOVE", direction });
  }

  return { move };
}

function send(socket: WebSocket, message: ClientMessage) {
  socket.send(JSON.stringify(message));
}

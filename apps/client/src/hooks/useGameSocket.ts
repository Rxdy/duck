import { useEffect, useRef } from "react";
import type { ClientMessage, ServerMessage } from "@duck/protocol";
import { useGameStore } from "../store/gameStore.js";

const SERVER_URL = import.meta.env.VITE_SERVER_WS_URL ?? "ws://localhost:8080";

export function useGameSocket(gameId: string, playerName: string) {
  const socketRef = useRef<WebSocket | null>(null);
  const setPlayers = useGameStore((state) => state.setPlayers);

  useEffect(() => {
    const socket = new WebSocket(SERVER_URL);
    socketRef.current = socket;

    socket.addEventListener("open", () => {
      send(socket, { type: "JOIN", gameId, name: playerName });
    });

    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data) as ServerMessage;
      if (message.type === "STATE") {
        setPlayers(message.players);
      }
    });

    return () => socket.close();
  }, [gameId, playerName, setPlayers]);

  return {
    move: (direction: "UP" | "DOWN" | "LEFT" | "RIGHT") => {
      if (socketRef.current) {
        send(socketRef.current, { type: "MOVE", direction });
      }
    },
  };
}

function send(socket: WebSocket, message: ClientMessage) {
  socket.send(JSON.stringify(message));
}

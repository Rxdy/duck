import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { WebSocketServer, type WebSocket } from "ws";
import type { ClientMessage } from "./protocol.js";
import { generateMap } from "./map-generator/index.js";
import { buildMapFromWire } from "./mapWire.js";
import { GameRoom } from "./room.js";

const PORT = Number(process.env.PORT ?? 8080);

const httpServer = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server: httpServer });
const rooms = new Map<string, GameRoom>();

function getOrCreateRoom(gameId: string): GameRoom {
  let room = rooms.get(gameId);
  if (!room) {
    room = new GameRoom(gameId, generateMap({ width: 12, height: 12, seed: Date.now() }));
    rooms.set(gameId, room);
  }
  return room;
}

wss.on("connection", (socket: WebSocket) => {
  const playerId = randomUUID();
  let currentRoom: GameRoom | null = null;

  socket.on("message", (raw) => {
    const message = JSON.parse(raw.toString()) as ClientMessage;

    if (message.type === "JOIN") {
      currentRoom = getOrCreateRoom(message.gameId);
      currentRoom.join(playerId, message.name, socket);
      return;
    }

    if (message.type === "JOIN_TEST") {
      const testRoomId = `test-${randomUUID()}`;
      const testRoom = new GameRoom(testRoomId, buildMapFromWire(message.map));
      rooms.set(testRoomId, testRoom);
      currentRoom = testRoom;
      currentRoom.join(playerId, "Testeur", socket);
      return;
    }

    currentRoom?.handle(playerId, message);
  });

  socket.on("close", () => {
    currentRoom?.leave(playerId);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Duck server listening on :${PORT}`);
});

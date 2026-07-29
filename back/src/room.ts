import { applyMove, Tile, type GameMap, type GameState } from "./game-engine/index.js";
import type { ClientMessage, PlayerState, ServerMessage } from "./protocol.js";
import { PLAYER_COLORS } from "./shared.js";
import type { WebSocket } from "ws";

export class GameRoom {
  private state: GameState;
  private sockets = new Map<string, WebSocket>();

  constructor(id: string, map: GameMap) {
    this.state = { id, map, players: [] };
  }

  join(playerId: string, name: string, socket: WebSocket): void {
    this.sockets.set(playerId, socket);
    const spawn = this.findSpawn();
    this.state.players.push({
      id: playerId,
      name,
      color: PLAYER_COLORS[this.state.players.length % PLAYER_COLORS.length]!,
      x: spawn.x,
      y: spawn.y,
      spawnX: spawn.x,
      spawnY: spawn.y,
      score: 0,
    });
    this.broadcastState();
  }

  leave(playerId: string): void {
    this.sockets.delete(playerId);
    this.state.players = this.state.players.filter((p) => p.id !== playerId);
    this.broadcastState();
  }

  handle(playerId: string, message: ClientMessage): void {
    if (message.type === "MOVE") {
      this.state = applyMove(this.state, playerId, message.direction);
      this.broadcastState();
    }
  }

  private findSpawn(): { x: number; y: number } {
    for (let y = 0; y < this.state.map.height; y++) {
      for (let x = 0; x < this.state.map.width; x++) {
        if (this.state.map.tiles[y]?.[x] === Tile.Spawn) return { x, y };
      }
    }
    return { x: 1, y: 1 };
  }

  private broadcastState(): void {
    const players: PlayerState[] = this.state.players;
    const message: ServerMessage = { type: "STATE", players };
    const payload = JSON.stringify(message);
    for (const socket of this.sockets.values()) {
      socket.send(payload);
    }
  }
}

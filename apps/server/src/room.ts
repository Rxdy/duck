import { applyMove, Tile, type GameState } from "@duck/game-engine";
import { generateMap } from "@duck/map-generator";
import type { ClientMessage, PlayerState, ServerMessage } from "@duck/protocol";
import type { WebSocket } from "ws";

const COLORS = ["#f5c518", "#e15554", "#4d9078", "#3d5a80"];

export class GameRoom {
  private state: GameState;
  private sockets = new Map<string, WebSocket>();

  constructor(
    id: string,
    private readonly seed: number,
  ) {
    this.state = {
      id,
      map: generateMap({ width: 12, height: 12, seed }),
      players: [],
    };
  }

  join(playerId: string, name: string, socket: WebSocket): void {
    this.sockets.set(playerId, socket);
    const spawn = this.findSpawn();
    this.state.players.push({
      id: playerId,
      name,
      color: COLORS[this.state.players.length % COLORS.length]!,
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

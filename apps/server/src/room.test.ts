import { describe, expect, it, vi } from "vitest";
import type { WebSocket } from "ws";
import { GameRoom } from "./room.js";

function fakeSocket() {
  return { send: vi.fn() } as unknown as WebSocket;
}

describe("GameRoom", () => {
  it("adds a player on join and broadcasts the new state", () => {
    const room = new GameRoom("room-1", 1);
    const socket = fakeSocket();

    room.join("p1", "Alice", socket);

    expect(socket.send).toHaveBeenCalledTimes(1);
    const [payload] = (socket.send as ReturnType<typeof vi.fn>).mock.calls[0]!;
    const message = JSON.parse(payload as string);
    expect(message.type).toBe("STATE");
    expect(message.players).toHaveLength(1);
    expect(message.players[0]).toMatchObject({ id: "p1", name: "Alice" });
  });

  it("removes a player on leave and broadcasts the remaining state", () => {
    const room = new GameRoom("room-2", 1);
    const socketA = fakeSocket();
    const socketB = fakeSocket();

    room.join("p1", "Alice", socketA);
    room.join("p2", "Bob", socketB);
    room.leave("p1");

    const calls = (socketB.send as ReturnType<typeof vi.fn>).mock.calls;
    const lastMessage = JSON.parse(calls[calls.length - 1]![0] as string);
    expect(lastMessage.players).toHaveLength(1);
    expect(lastMessage.players[0]).toMatchObject({ id: "p2" });
  });

  it("applies a move for a joined player", () => {
    const room = new GameRoom("room-3", 1);
    const socket = fakeSocket();
    room.join("p1", "Alice", socket);

    room.handle("p1", { type: "MOVE", direction: "RIGHT" });

    const calls = (socket.send as ReturnType<typeof vi.fn>).mock.calls;
    const lastMessage = JSON.parse(calls[calls.length - 1]![0] as string);
    expect(lastMessage.players[0].x).toBeGreaterThanOrEqual(0);
  });
});

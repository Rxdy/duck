import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WebSocket } from "ws";
import { Tile, type GameMap } from "./game-engine/index.js";
import { GameRoom } from "./room.js";
import { Matchmaker, WAIT_FOR_HUMANS_MS } from "./matchmaking.js";

function fakeSocket() {
  return { send: vi.fn() } as unknown as WebSocket;
}

/** Carte minimale à deux bases : de quoi remplir une salle de duel. */
function duelMap(): GameMap {
  return {
    width: 3,
    height: 1,
    tiles: [[Tile.Spawn, Tile.Empty, Tile.Spawn]],
  };
}

function duelRoom(id = "duel-1", capacity = 2): GameRoom {
  return new GameRoom(
    id,
    duelMap(),
    [
      { x: 0, y: 0, color: 0 },
      { x: 2, y: 0, color: 1 },
    ],
    undefined,
    undefined,
    capacity,
  );
}

/** Dernier message reçu par une socket, décodé. */
function lastMessage(socket: WebSocket): { type: string; [key: string]: unknown } {
  const calls = (socket.send as ReturnType<typeof vi.fn>).mock.calls;
  return JSON.parse(calls[calls.length - 1]![0] as string) as { type: string };
}

describe("Matchmaker", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("has no open room before anyone asks for one", () => {
    expect(new Matchmaker().find("duel")).toBeUndefined();
  });

  it("hands the waiting room of the mode to the next player, instead of opening a second one", () => {
    const matchmaker = new Matchmaker();
    const room = duelRoom();

    matchmaker.hold("duel", room, async () => {});
    room.join("p1", "Alice", fakeSocket());

    expect(matchmaker.find("duel")).toBe(room);
  });

  it("keeps the modes apart — a duel player never lands in an FFA room", () => {
    const matchmaker = new Matchmaker();
    const room = duelRoom();

    matchmaker.hold("duel", room, async () => {});

    expect(matchmaker.find("ffa4")).toBeUndefined();
  });

  it("starts a full room at once rather than making it sit out the delay", async () => {
    const matchmaker = new Matchmaker();
    const room = duelRoom();
    const fill = vi.fn().mockResolvedValue(undefined);
    const socket = fakeSocket();

    matchmaker.hold("duel", room, fill);
    room.join("p1", "Alice", socket);
    room.join("p2", "Bob", fakeSocket());
    matchmaker.settle("duel");
    await vi.advanceTimersByTimeAsync(0);

    expect(room.isStarted).toBe(true);
    expect(lastMessage(socket).type).toBe("STATE");
    // Le remplissage est demandé même quand il n'y a plus de place : c'est lui
    // qui compte les sièges libres, pas l'appelant (voir index.ts#fillWithBots).
    expect(fill).toHaveBeenCalledTimes(1);
    expect(room.freeSeats).toBe(0);
  });

  it("a room that has started is never handed out again", async () => {
    const matchmaker = new Matchmaker();
    const room = duelRoom();

    matchmaker.hold("duel", room, async () => {});
    room.join("p1", "Alice", fakeSocket());
    room.join("p2", "Bob", fakeSocket());
    matchmaker.settle("duel");
    await vi.advanceTimersByTimeAsync(0);

    expect(matchmaker.find("duel")).toBeUndefined();
  });

  it("fills the empty seats with bots and starts once the delay runs out", async () => {
    const matchmaker = new Matchmaker();
    const room = duelRoom();
    const socket = fakeSocket();
    const fill = vi.fn().mockImplementation(async () => {
      room.addBot("bot-1", "Bot");
    });

    matchmaker.hold("duel", room, fill);
    room.join("p1", "Alice", socket);

    // Juste avant l'échéance : on attend encore, et les coups sont refusés.
    await vi.advanceTimersByTimeAsync(WAIT_FOR_HUMANS_MS - 1);
    expect(room.isStarted).toBe(false);
    expect(lastMessage(socket).type).toBe("WAITING");

    await vi.advanceTimersByTimeAsync(1);
    expect(fill).toHaveBeenCalledTimes(1);
    expect(room.isStarted).toBe(true);
    expect(lastMessage(socket).type).toBe("STATE");
  });

  it("still starts the game when filling the seats fails", async () => {
    const matchmaker = new Matchmaker();
    const room = duelRoom();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    // Une base injoignable ne doit pas laisser le joueur devant un écran
    // d'attente qui ne finit jamais : il joue, avec moins d'adversaires.
    matchmaker.hold("duel", room, () => Promise.reject(new Error("base injoignable")));
    room.join("p1", "Alice", fakeSocket());
    await vi.advanceTimersByTimeAsync(WAIT_FOR_HUMANS_MS);

    expect(room.isStarted).toBe(true);
    consoleError.mockRestore();
  });

  it("disarms the departure of a waiting room left by its last human", async () => {
    const matchmaker = new Matchmaker();
    const room = duelRoom();
    const fill = vi.fn().mockResolvedValue(undefined);

    matchmaker.hold("duel", room, fill);
    room.join("p1", "Alice", fakeSocket());
    room.leave("p1");
    matchmaker.release("duel", room);
    await vi.advanceTimersByTimeAsync(WAIT_FOR_HUMANS_MS);

    // Personne ne regarde : ni bots ajoutés, ni partie lancée.
    expect(fill).not.toHaveBeenCalled();
    expect(room.isStarted).toBe(false);
    expect(matchmaker.find("duel")).toBeUndefined();
  });

  it("keeps the room waiting when one human leaves but another stays", async () => {
    const matchmaker = new Matchmaker();
    const room = duelRoom("ffa", 4);
    const fill = vi.fn().mockResolvedValue(undefined);

    matchmaker.hold("duel", room, fill);
    room.join("p1", "Alice", fakeSocket());
    room.join("p2", "Bob", fakeSocket());
    room.leave("p1");
    matchmaker.release("duel", room);

    expect(matchmaker.find("duel")).toBe(room);

    await vi.advanceTimersByTimeAsync(WAIT_FOR_HUMANS_MS);
    expect(fill).toHaveBeenCalledTimes(1);
    expect(room.isStarted).toBe(true);
  });

  it("opens a fresh room for the mode once the previous one has gone", async () => {
    const matchmaker = new Matchmaker();
    const first = duelRoom("duel-1");
    const second = duelRoom("duel-2");

    matchmaker.hold("duel", first, async () => {});
    first.join("p1", "Alice", fakeSocket());
    first.join("p2", "Bob", fakeSocket());
    matchmaker.settle("duel");
    await vi.advanceTimersByTimeAsync(0);

    matchmaker.hold("duel", second, async () => {});
    second.join("p3", "Carol", fakeSocket());

    expect(matchmaker.find("duel")).toBe(second);
    // La salle partie continue sa vie de son côté : elle n'est pas recyclée.
    expect(first.isStarted).toBe(true);
    expect(first.id).not.toBe(second.id);
  });

  it("does not start a room twice when its delay expires after it filled up", async () => {
    const matchmaker = new Matchmaker();
    const room = duelRoom();
    const fill = vi.fn().mockResolvedValue(undefined);

    matchmaker.hold("duel", room, fill);
    room.join("p1", "Alice", fakeSocket());
    room.join("p2", "Bob", fakeSocket());
    matchmaker.settle("duel");
    await vi.advanceTimersByTimeAsync(WAIT_FOR_HUMANS_MS * 2);

    expect(fill).toHaveBeenCalledTimes(1);
  });

  it("clear() disarms every pending departure", async () => {
    const matchmaker = new Matchmaker();
    const room = duelRoom();
    const fill = vi.fn().mockResolvedValue(undefined);

    matchmaker.hold("duel", room, fill);
    room.join("p1", "Alice", fakeSocket());
    matchmaker.clear();
    await vi.advanceTimersByTimeAsync(WAIT_FOR_HUMANS_MS);

    expect(fill).not.toHaveBeenCalled();
    expect(matchmaker.find("duel")).toBeUndefined();
  });
});

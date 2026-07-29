import { describe, expect, it, vi } from "vitest";
import type { WebSocket } from "ws";
import { Tile, type GameMap } from "./game-engine/index.js";
import { generateMap } from "./map-generator/index.js";
import { GameRoom } from "./room.js";

function fakeSocket() {
  return { send: vi.fn() } as unknown as WebSocket;
}

function testMap(seed = 1): GameMap {
  return generateMap({ width: 12, height: 12, seed });
}

describe("GameRoom", () => {
  it("adds a player on join and broadcasts the new state", () => {
    const room = new GameRoom("room-1", testMap());
    const socket = fakeSocket();

    room.join("p1", "Alice", socket);

    expect(socket.send).toHaveBeenCalledTimes(1);
    const [payload] = (socket.send as ReturnType<typeof vi.fn>).mock.calls[0]!;
    const message = JSON.parse(payload as string);
    expect(message.type).toBe("STATE");
    expect(message.players).toHaveLength(1);
    expect(message.players[0]).toMatchObject({ id: "p1", name: "Alice" });
  });

  it("exposes the room's map for the client to render (walls included)", () => {
    const map: GameMap = {
      width: 3,
      height: 2,
      tiles: [
        [Tile.Wall, Tile.Spawn, Tile.Wall],
        [Tile.Wall, Tile.Empty, Tile.Wall],
      ],
    };
    const room = new GameRoom("room-map", map);

    expect(room.getMapMessage()).toEqual({
      type: "MAP",
      width: 3,
      height: 2,
      tiles: map.tiles,
    });
  });

  it("removes a player on leave and broadcasts the remaining state", () => {
    const room = new GameRoom("room-2", testMap());
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
    const room = new GameRoom("room-3", testMap());
    const socket = fakeSocket();
    room.join("p1", "Alice", socket);

    room.handle("p1", { type: "MOVE", direction: "RIGHT" });

    const calls = (socket.send as ReturnType<typeof vi.fn>).mock.calls;
    const lastMessage = JSON.parse(calls[calls.length - 1]![0] as string);
    expect(lastMessage.players[0].x).toBeGreaterThanOrEqual(0);
  });

  it("ignores a MOVE sent before the per-player cooldown elapses (keyboard auto-repeat / spam)", () => {
    const openMap: GameMap = {
      width: 5,
      height: 1,
      tiles: [[Tile.Spawn, Tile.Empty, Tile.Empty, Tile.Empty, Tile.Empty]],
    };

    vi.useFakeTimers();
    try {
      const room = new GameRoom("room-cooldown", openMap);
      const socket = fakeSocket();
      room.join("p1", "Alice", socket);

      room.handle("p1", { type: "MOVE", direction: "RIGHT" });
      room.handle("p1", { type: "MOVE", direction: "RIGHT" }); // trop tôt, ignoré

      let calls = (socket.send as ReturnType<typeof vi.fn>).mock.calls;
      let lastMessage = JSON.parse(calls[calls.length - 1]![0] as string);
      expect(lastMessage.players[0]).toMatchObject({ x: 1 });

      vi.advanceTimersByTime(120);
      room.handle("p1", { type: "MOVE", direction: "RIGHT" }); // cooldown écoulé, accepté

      calls = (socket.send as ReturnType<typeof vi.fn>).mock.calls;
      lastMessage = JSON.parse(calls[calls.length - 1]![0] as string);
      expect(lastMessage.players[0]).toMatchObject({ x: 2 });
    } finally {
      vi.useRealTimers();
    }
  });

  it("spawns the player on a custom map's Spawn tile (mode entraînement)", () => {
    const map: GameMap = {
      width: 3,
      height: 3,
      tiles: [
        [Tile.Wall, Tile.Wall, Tile.Wall],
        [Tile.Wall, Tile.Spawn, Tile.Wall],
        [Tile.Wall, Tile.Wall, Tile.Wall],
      ],
    };
    const room = new GameRoom("test-room", map);
    const socket = fakeSocket();

    room.join("p1", "Testeur", socket);

    const [payload] = (socket.send as ReturnType<typeof vi.fn>).mock.calls[0]!;
    const message = JSON.parse(payload as string);
    expect(message.players[0]).toMatchObject({ x: 1, y: 1 });
  });

  function twoSpawnMap(): GameMap {
    return {
      width: 4,
      height: 3,
      tiles: [
        [Tile.Wall, Tile.Wall, Tile.Wall, Tile.Wall],
        [Tile.Wall, Tile.Spawn, Tile.Spawn, Tile.Wall],
        [Tile.Wall, Tile.Wall, Tile.Wall, Tile.Wall],
      ],
    };
  }

  it("assigns each joining player a distinct Spawn tile instead of stacking them", () => {
    const room = new GameRoom("test-room", twoSpawnMap());
    const socketA = fakeSocket();
    const socketB = fakeSocket();

    room.join("p1", "Alice", socketA);
    room.join("p2", "Bob", socketB);

    const calls = (socketB.send as ReturnType<typeof vi.fn>).mock.calls;
    const lastMessage = JSON.parse(calls[calls.length - 1]![0] as string);
    expect(lastMessage.players[0]).toMatchObject({ x: 1, y: 1 });
    expect(lastMessage.players[1]).toMatchObject({ x: 2, y: 1 });
  });

  it("uses the explicit spawnOrder (editor colors) instead of scan order when provided", () => {
    // Ordre de scan naturel : (1,1) puis (2,1). On fournit l'inverse pour
    // vérifier qu'il prend bien le dessus — c'est ce qui garantit que le
    // joueur apparaît avec la couleur du spawn sur lequel il est posé.
    const room = new GameRoom("test-room", twoSpawnMap(), [
      { x: 2, y: 1 },
      { x: 1, y: 1 },
    ]);
    const socket = fakeSocket();

    room.join("p1", "Alice", socket);

    const [payload] = (socket.send as ReturnType<typeof vi.fn>).mock.calls[0]!;
    const message = JSON.parse(payload as string);
    expect(message.players[0]).toMatchObject({ x: 2, y: 1 });
  });

  it("adds a bot player that moves on its own on a timer", () => {
    vi.useFakeTimers();
    try {
      const room = new GameRoom("test-room", twoSpawnMap());
      const socket = fakeSocket();
      room.join("p1", "Testeur", socket);

      room.addBot("bot", "Bot");
      let calls = (socket.send as ReturnType<typeof vi.fn>).mock.calls;
      let lastMessage = JSON.parse(calls[calls.length - 1]![0] as string);
      expect(lastMessage.players).toHaveLength(2);
      const initialBotPosition = { x: lastMessage.players[1].x, y: lastMessage.players[1].y };

      vi.spyOn(Math, "random").mockReturnValue(0); // toujours "UP" (premier de la liste)
      vi.advanceTimersByTime(700);

      calls = (socket.send as ReturnType<typeof vi.fn>).mock.calls;
      lastMessage = JSON.parse(calls[calls.length - 1]![0] as string);
      // Le bot est dans un couloir horizontal : "UP" cogne un mur, il ne bouge donc pas.
      // On vérifie surtout qu'un déplacement a bien été tenté (broadcast supplémentaire).
      expect(calls.length).toBeGreaterThan(1);
      expect(lastMessage.players[1]).toMatchObject(initialBotPosition);
    } finally {
      vi.useRealTimers();
      vi.restoreAllMocks();
    }
  });

  function openRoomMap(): GameMap {
    return {
      width: 5,
      height: 5,
      tiles: [
        [Tile.Wall, Tile.Wall, Tile.Wall, Tile.Wall, Tile.Wall],
        [Tile.Wall, Tile.Spawn, Tile.Empty, Tile.Empty, Tile.Wall],
        [Tile.Wall, Tile.Empty, Tile.Empty, Tile.Empty, Tile.Wall],
        [Tile.Wall, Tile.Empty, Tile.Empty, Tile.Spawn, Tile.Wall],
        [Tile.Wall, Tile.Wall, Tile.Wall, Tile.Wall, Tile.Wall],
      ],
    };
  }

  it("chases the nearest enemy base when the dice roll favors it", () => {
    vi.useFakeTimers();
    try {
      const room = new GameRoom("test-room", openRoomMap());
      const socket = fakeSocket();
      room.join("p1", "Testeur", socket); // spawn (1,1)
      room.addBot("bot", "Bot"); // spawn (3,3)

      vi.spyOn(Math, "random").mockReturnValue(0); // < BOT_CHASE_CHANCE -> poursuite
      vi.advanceTimersByTime(700);

      const calls = (socket.send as ReturnType<typeof vi.fn>).mock.calls;
      const lastMessage = JSON.parse(calls[calls.length - 1]![0] as string);
      const bot = lastMessage.players.find((p: { id: string }) => p.id === "bot");
      // Se rapproche de la base du joueur (1,1) : x diminue, y inchangé.
      expect(bot).toMatchObject({ x: 2, y: 3 });
    } finally {
      vi.useRealTimers();
      vi.restoreAllMocks();
    }
  });

  it("moves randomly among only the currently valid directions when the dice roll skips the chase", () => {
    vi.useFakeTimers();
    try {
      const room = new GameRoom("test-room", openRoomMap());
      const socket = fakeSocket();
      room.join("p1", "Testeur", socket);
      room.addBot("bot", "Bot"); // spawn (3,3)

      // 1er appel (jet de poursuite) >= BOT_CHASE_CHANCE -> pas de poursuite ;
      // 2e appel (choix parmi les directions valides) -> la première (UP).
      vi.spyOn(Math, "random").mockReturnValueOnce(0.9).mockReturnValueOnce(0);
      vi.advanceTimersByTime(700);

      const calls = (socket.send as ReturnType<typeof vi.fn>).mock.calls;
      const lastMessage = JSON.parse(calls[calls.length - 1]![0] as string);
      const bot = lastMessage.players.find((p: { id: string }) => p.id === "bot");
      // DOWN et RIGHT cognent un mur depuis (3,3) : seules UP et LEFT sont
      // valides, dans cet ordre (voir BOT_DIRECTIONS) -> le 1er choix est UP.
      expect(bot).toMatchObject({ x: 3, y: 2 });
    } finally {
      vi.useRealTimers();
      vi.restoreAllMocks();
    }
  });

  it("never walks onto another player's tile, even when that's the direction it wants to chase", () => {
    // Couloir à 3 spawns : Testeur (1,1), Blocker (3,1) — la base la plus
    // proche du bot, mais Blocker est justement dessus — et le bot (4,1).
    const corridor: GameMap = {
      width: 6,
      height: 3,
      tiles: [
        [Tile.Wall, Tile.Wall, Tile.Wall, Tile.Wall, Tile.Wall, Tile.Wall],
        [Tile.Wall, Tile.Spawn, Tile.Empty, Tile.Spawn, Tile.Spawn, Tile.Wall],
        [Tile.Wall, Tile.Wall, Tile.Wall, Tile.Wall, Tile.Wall, Tile.Wall],
      ],
    };

    vi.useFakeTimers();
    try {
      const room = new GameRoom("test-room", corridor);
      const socketA = fakeSocket();
      const socketB = fakeSocket();
      room.join("p1", "Testeur", socketA); // (1,1)
      room.join("p2", "Blocker", socketB); // (3,1) — base la plus proche du bot
      room.addBot("bot", "Bot"); // (4,1)

      vi.spyOn(Math, "random").mockReturnValue(0); // force la poursuite
      vi.advanceTimersByTime(700);

      const calls = (socketA.send as ReturnType<typeof vi.fn>).mock.calls;
      const lastMessage = JSON.parse(calls[calls.length - 1]![0] as string);
      const bot = lastMessage.players.find((p: { id: string }) => p.id === "bot");
      const blocker = lastMessage.players.find((p: { id: string }) => p.id === "p2");

      // Blocker campe sa propre base : le bot ne peut pas s'y superposer, même
      // en le pourchassant, et reste donc bloqué sur sa case de départ.
      expect(bot).not.toMatchObject({ x: blocker.x, y: blocker.y });
      expect(bot).toMatchObject({ x: 4, y: 1 });
    } finally {
      vi.useRealTimers();
      vi.restoreAllMocks();
    }
  });

  it("stops the bot's timer once every human has left the room", () => {
    vi.useFakeTimers();
    try {
      const room = new GameRoom("test-room", twoSpawnMap());
      const socket = fakeSocket();
      room.join("p1", "Testeur", socket);
      room.addBot("bot", "Bot");

      // Le tick du bot lit Math.random() pour choisir sa direction : s'il
      // continue d'être appelé après le départ du dernier humain, c'est que
      // le timer n'a pas été arrêté (fuite d'intervalle en arrière-plan).
      const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0);
      room.leave("p1");
      randomSpy.mockClear();

      vi.advanceTimersByTime(700 * 5);

      expect(randomSpy).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
      vi.restoreAllMocks();
    }
  });

  describe("win condition (winScore)", () => {
    const mapWithGoal: GameMap = {
      width: 3,
      height: 1,
      tiles: [[Tile.Spawn, Tile.Empty, Tile.Goal]],
    };

    function scoreOnce(room: GameRoom) {
      room.handle("p1", { type: "MOVE", direction: "RIGHT" });
      vi.advanceTimersByTime(150);
      room.handle("p1", { type: "MOVE", direction: "RIGHT" }); // (2,0) = Goal
      vi.advanceTimersByTime(150);
    }

    it("broadcasts STATE (not END) while the score is still below winScore", () => {
      vi.useFakeTimers();
      try {
        const room = new GameRoom("room-win-1", mapWithGoal, [], 2);
        const socket = fakeSocket();
        room.join("p1", "Alice", socket);

        scoreOnce(room); // score = 1, winScore = 2 : pas encore fini

        const calls = (socket.send as ReturnType<typeof vi.fn>).mock.calls;
        const last = JSON.parse(calls[calls.length - 1]![0] as string);
        expect(last.type).toBe("STATE");
        expect(last.players[0]).toMatchObject({ score: 1 });
      } finally {
        vi.useRealTimers();
      }
    });

    it("broadcasts END with the winner's id once winScore is reached", () => {
      vi.useFakeTimers();
      try {
        const room = new GameRoom("room-win-2", mapWithGoal, [], 2);
        const socket = fakeSocket();
        room.join("p1", "Alice", socket);

        scoreOnce(room); // score = 1
        scoreOnce(room); // score = 2 -> gagné

        const calls = (socket.send as ReturnType<typeof vi.fn>).mock.calls;
        const last = JSON.parse(calls[calls.length - 1]![0] as string);
        expect(last).toEqual({ type: "END", winnerId: "p1" });
      } finally {
        vi.useRealTimers();
      }
    });

    it("reports the match result (with anonId) via matchContext.onEnd once someone wins", () => {
      vi.useFakeTimers();
      try {
        const onEnd = vi.fn();
        const room = new GameRoom("room-win-report", mapWithGoal, [], 2, {
          mapName: "#1 map 1v1",
          onEnd,
        });
        const socket = fakeSocket();
        room.join("p1", "Alice", socket, "anon-123");

        scoreOnce(room); // score = 1
        expect(onEnd).not.toHaveBeenCalled();

        scoreOnce(room); // score = 2 -> gagné

        expect(onEnd).toHaveBeenCalledWith({
          mapName: "#1 map 1v1",
          players: [
            {
              anonId: "anon-123",
              name: "Alice",
              color: expect.any(String),
              score: 2,
              isWinner: true,
            },
          ],
        });
      } finally {
        vi.useRealTimers();
      }
    });

    it("reports null anonId for a player who never provided one (ex. a bot)", () => {
      vi.useFakeTimers();
      try {
        const onEnd = vi.fn();
        const room = new GameRoom("room-win-no-anon", mapWithGoal, [], 1, {
          mapName: "Sans nom",
          onEnd,
        });
        const socket = fakeSocket();
        room.join("p1", "Alice", socket); // pas d'anonId fourni

        scoreOnce(room); // score = 1 -> gagné

        expect(onEnd).toHaveBeenCalledWith(
          expect.objectContaining({
            players: [expect.objectContaining({ anonId: null })],
          }),
        );
      } finally {
        vi.useRealTimers();
      }
    });

    it("ignores every move sent after the game has ended", () => {
      vi.useFakeTimers();
      try {
        const room = new GameRoom("room-win-3", mapWithGoal, [], 1);
        const socket = fakeSocket();
        room.join("p1", "Alice", socket);

        scoreOnce(room); // score = 1 -> gagné (winScore = 1)
        const callsAtEnd = (socket.send as ReturnType<typeof vi.fn>).mock.calls.length;

        room.handle("p1", { type: "MOVE", direction: "LEFT" });

        expect((socket.send as ReturnType<typeof vi.fn>).mock.calls.length).toBe(callsAtEnd);
      } finally {
        vi.useRealTimers();
      }
    });

    it("never ends the game when no winScore is provided (mode entraînement)", () => {
      vi.useFakeTimers();
      try {
        const room = new GameRoom("room-no-win", mapWithGoal); // pas de winScore
        const socket = fakeSocket();
        room.join("p1", "Alice", socket);

        scoreOnce(room); // score = 1

        const calls = (socket.send as ReturnType<typeof vi.fn>).mock.calls;
        const last = JSON.parse(calls[calls.length - 1]![0] as string);
        expect(last.type).toBe("STATE");
        expect(last.players[0]).toMatchObject({ score: 1 });
      } finally {
        vi.useRealTimers();
      }
    });
  });
});

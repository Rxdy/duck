import { describe, expect, it, vi } from "vitest";
import type { WebSocket } from "ws";
import { Tile, type GameMap } from "./game-engine/index.js";
import { generateMap } from "./map-generator/index.js";
import { GameRoom } from "./room.js";
import { PLAYER_COLORS } from "./shared.js";
import { POINTS_PER_BASE } from "./game-engine/index.js";

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

  it("ignores a MOVE sent faster than any human could type (client scripté)", () => {
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
      room.handle("p1", { type: "MOVE", direction: "RIGHT" }); // même milliseconde, ignoré

      let calls = (socket.send as ReturnType<typeof vi.fn>).mock.calls;
      let lastMessage = JSON.parse(calls[calls.length - 1]![0] as string);
      expect(lastMessage.players[0]).toMatchObject({ x: 1 });

      // 50 ms = 20 actions/s : au-delà de ce qu'un joueur atteint au clavier,
      // donc jamais atteint en jouant normalement.
      vi.advanceTimersByTime(50);
      room.handle("p1", { type: "MOVE", direction: "RIGHT" }); // plancher écoulé, accepté

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
      { x: 2, y: 1, color: 0 },
      { x: 1, y: 1, color: 1 },
    ]);
    const socket = fakeSocket();

    room.join("p1", "Alice", socket);

    const [payload] = (socket.send as ReturnType<typeof vi.fn>).mock.calls[0]!;
    const message = JSON.parse(payload as string);
    expect(message.players[0]).toMatchObject({ x: 2, y: 1 });
  });

  it("colors each player after their own spawn, not their join rank", () => {
    // Carte qui saute une couleur (spawn-0 puis spawn-2, cas d'une carte à 3
    // spawns où l'auteur n'a pas pris les couleurs à la suite) : le 2e joueur
    // doit être ambre comme sa case, pas cyan comme son rang d'arrivée.
    const room = new GameRoom("test-room", twoSpawnMap(), [
      { x: 1, y: 1, color: 0 },
      { x: 2, y: 1, color: 2 },
    ]);
    const socket = fakeSocket();

    room.join("p1", "Alice", socket);
    room.join("p2", "Bob", fakeSocket());

    const calls = (socket.send as ReturnType<typeof vi.fn>).mock.calls;
    const lastMessage = JSON.parse(calls[calls.length - 1]![0] as string);
    expect(lastMessage.players[0]).toMatchObject({ x: 1, y: 1, color: PLAYER_COLORS[0] });
    expect(lastMessage.players[1]).toMatchObject({ x: 2, y: 1, color: PLAYER_COLORS[2] });
  });

  it("stops EVERY bot when the last human leaves, not just the last one added", () => {
    // En FFA il y a deux ou trois bots dans la salle : n'en arrêter qu'un
    // laissait les autres se déplacer indéfiniment côté serveur, dans une
    // salle que plus personne ne regarde.
    vi.useFakeTimers();
    try {
      const room = new GameRoom("test-room", twoSpawnMap());
      room.join("p1", "Alice", fakeSocket());
      room.addBot("bot-1", "Bot 1");
      room.addBot("bot-2", "Bot 2");
      room.addBot("bot-3", "Bot 3");

      expect(vi.getTimerCount()).toBe(3);

      room.leave("p1");

      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
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
        const room = new GameRoom("room-win-1", mapWithGoal, [], 2 * POINTS_PER_BASE);
        const socket = fakeSocket();
        room.join("p1", "Alice", socket);

        scoreOnce(room); // une base atteinte, il en faut deux

        const calls = (socket.send as ReturnType<typeof vi.fn>).mock.calls;
        const last = JSON.parse(calls[calls.length - 1]![0] as string);
        expect(last.type).toBe("STATE");
        expect(last.players[0]).toMatchObject({ score: POINTS_PER_BASE });
      } finally {
        vi.useRealTimers();
      }
    });

    it("broadcasts END with the winner's id once winScore is reached", () => {
      vi.useFakeTimers();
      try {
        const room = new GameRoom("room-win-2", mapWithGoal, [], 2 * POINTS_PER_BASE);
        const socket = fakeSocket();
        room.join("p1", "Alice", socket);

        scoreOnce(room);
        scoreOnce(room); // deuxième base -> gagné

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
        const room = new GameRoom("room-win-report", mapWithGoal, [], 2 * POINTS_PER_BASE, {
          mapName: "#1 map 1v1",
          mode: "duel",
          onEnd,
        });
        const socket = fakeSocket();
        room.join("p1", "Alice", socket, "anon-123");

        scoreOnce(room);
        expect(onEnd).not.toHaveBeenCalled();

        scoreOnce(room); // deuxième base -> gagné

        expect(onEnd).toHaveBeenCalledWith({
          mapName: "#1 map 1v1",
          mode: "duel",
          durationMs: expect.any(Number),
          players: [
            {
              anonId: "anon-123",
              name: "Alice",
              color: expect.any(String),
              score: 2 * POINTS_PER_BASE,
              isWinner: true,
            },
          ],
        });
      } finally {
        vi.useRealTimers();
      }
    });

    it("chronomètre la partie à partir de l'entrée du premier joueur", () => {
      // La salle est créée puis rejointe : cette latence ne doit pas être
      // facturée au joueur dans le récapitulatif de la page Compte.
      vi.useFakeTimers();
      try {
        const onEnd = vi.fn();
        const room = new GameRoom("room-duree", mapWithGoal, [], 1, {
          mapName: "Sans nom",
          mode: "duel",
          onEnd,
        });
        vi.advanceTimersByTime(5_000); // salle en attente, personne ne joue

        room.join("p1", "Alice", fakeSocket());
        scoreOnce(room); // base atteinte au 2e coup, 150 ms après l'entrée

        // Les 5 s d'attente ne comptent pas : seul le temps joué est mesuré.
        expect(onEnd.mock.calls[0]![0].durationMs).toBe(150);
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
          mode: "duel",
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
        expect(last.players[0]).toMatchObject({ score: POINTS_PER_BASE });
      } finally {
        vi.useRealTimers();
      }
    });
  });
});

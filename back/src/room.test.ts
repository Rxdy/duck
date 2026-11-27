import { describe, expect, it, vi, afterEach } from "vitest";
import type { WebSocket } from "ws";
import { Tile, type GameMap } from "./game-engine/index.js";
import { generateMap } from "./map-generator/index.js";
import { STEP_MS } from "./shared.js";
import { FLEE_MS, GameRoom } from "./room.js";
import { PLAYER_COLORS } from "./shared.js";
import { POINTS_PER_BASE } from "./game-engine/index.js";

function fakeSocket() {
  return { send: vi.fn() } as unknown as WebSocket;
}

/** Dernier message reçu par une socket, décodé. */
function lastMessage(socket: WebSocket): { type: string; [key: string]: unknown } {
  const calls = (socket.send as ReturnType<typeof vi.fn>).mock.calls;
  return JSON.parse(calls[calls.length - 1]![0] as string) as { type: string };
}

function testMap(seed = 1): GameMap {
  return generateMap({ width: 12, height: 12, seed });
}

/** Le dernier état reçu par ce joueur. */
function lastState(socket: { send: unknown }): { players: { x: number }[] } {
  const calls = (socket.send as unknown as { mock: { calls: [string][] } }).mock.calls;
  return calls
    .map(([raw]) => JSON.parse(raw) as { type: string; players: { x: number }[] })
    .filter((m) => m.type === "STATE")
    .at(-1)!;
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

  describe("un pas par glissade", () => {
    afterEach(() => vi.useRealTimers());

    /** Un couloir assez long, et un joueur au départ (1,1). */
    function corridor() {
      vi.useFakeTimers();
      const tiles = [Array(9).fill(Tile.Wall), Array(9).fill(Tile.Empty), Array(9).fill(Tile.Wall)];
      tiles[1]![0] = Tile.Wall;
      tiles[1]![1] = Tile.Spawn;
      const room = new GameRoom("pas", { width: 9, height: 3, tiles });
      const socket = fakeSocket();
      room.join("p1", "Ana", socket);
      const x = () => lastState(socket).players[0]!.x;
      const right = () => room.handle("p1", { type: "MOVE", direction: "RIGHT" });
      return { x, right, room };
    }

    it("n'avance pas plus vite en martelant, même avec un client scripté", () => {
      const { x, right } = corridor();

      for (let i = 0; i < 20; i++) right();
      expect(x()).toBe(2);

      vi.advanceTimersByTime(STEP_MS - 1);
      expect(x()).toBe(2);
      vi.advanceTimersByTime(1);
      // Un seul pas était gardé, pas les dix-neuf autres.
      expect(x()).toBe(3);
      vi.advanceTimersByTime(STEP_MS * 5);
      expect(x()).toBe(3);
    });

    it("répond aussitôt à un canard au repos", () => {
      const { x, right } = corridor();
      right();
      vi.advanceTimersByTime(STEP_MS);

      right();

      expect(x()).toBe(3);
    });

    it("oublie le pas en attente d'un joueur parti", () => {
      const { right, room } = corridor();
      right();
      right();

      room.leave("p1");

      expect(vi.getTimerCount()).toBe(0);
    });
  });

  describe("chance de fuir", () => {
    afterEach(() => vi.useRealTimers());

    type Seen = { id: string; x: number; y: number; score: number };
    const seen = (socket: WebSocket, id: string) =>
      (lastState(socket) as unknown as { players: Seen[] }).players.find((p) => p.id === id)!;

    /** Couloir : A part de x=1, B de x=7 ; ils se retrouvent face à face en x=4 et x=5. */
    function faceToFace() {
      vi.useFakeTimers();
      const row = Array(9).fill(Tile.Empty);
      row[0] = Tile.Wall;
      row[8] = Tile.Wall;
      row[1] = Tile.Spawn;
      row[7] = Tile.Spawn;
      const tiles = [Array(9).fill(Tile.Wall), row, Array(9).fill(Tile.Wall)];
      const room = new GameRoom("fuite", { width: 9, height: 3, tiles });
      const socket = fakeSocket();
      room.join("a", "Ana", socket);
      room.join("b", "Bob", fakeSocket());
      const move = (id: string, direction: "LEFT" | "RIGHT" | "UP") =>
        room.handle(id, { type: "MOVE", direction });
      for (let i = 0; i < 3; i++) {
        move("a", "RIGHT");
        if (i < 2) move("b", "LEFT");
        vi.advanceTimersByTime(STEP_MS);
      }
      // Les protections de départ sont passées, plus aucun pas en attente.
      vi.advanceTimersByTime(2000);
      const a = () => seen(socket, "a");
      const b = () => seen(socket, "b");
      expect([a().x, b().x]).toEqual([4, 5]);
      return { move, a, b };
    }

    it("touche une cible immobile, une fois la chance de fuir passée", () => {
      const { move, a, b } = faceToFace();
      move("a", "RIGHT");
      expect(a().x).toBe(4);

      vi.advanceTimersByTime(FLEE_MS);

      expect(a().x).toBe(5);
      expect(b().x).toBe(7); // renvoyé chez lui
    });

    it("laisse fuir la victime qui part dans l'intervalle", () => {
      const { move, a, b } = faceToFace();
      move("a", "RIGHT");
      vi.advanceTimersByTime(FLEE_MS / 2);
      move("b", "RIGHT");

      vi.advanceTimersByTime(FLEE_MS);

      expect(b().x).toBe(6);
      expect(a().x).toBe(5); // entré sur la case libérée, sans toucher
    });

    it("touche la victime qui part trop tard", () => {
      const { move, a, b } = faceToFace();
      move("a", "RIGHT");
      vi.advanceTimersByTime(FLEE_MS);
      move("b", "RIGHT");

      expect(a().x).toBe(5);
      expect(b().x).toBe(7);
    });

    it("ne sauve pas une fuite contre un mur", () => {
      const { move, a, b } = faceToFace();
      move("a", "RIGHT");
      move("b", "UP");
      vi.advanceTimersByTime(FLEE_MS);

      expect(a().x).toBe(5);
      expect(b().x).toBe(7);
    });

    it("face à face : le premier arrivé touche, la riposte tombe", () => {
      const { move, a, b } = faceToFace();
      move("a", "RIGHT");
      vi.advanceTimersByTime(FLEE_MS / 3);
      move("b", "LEFT");

      expect(a().x).toBe(5);
      expect(b().x).toBe(7);
      vi.advanceTimersByTime(STEP_MS * 3);
      expect(b().x).toBe(7);
    });

    it("garde le pas demandé pendant la retenue", () => {
      const { move, a } = faceToFace();
      move("a", "RIGHT");
      move("a", "RIGHT");
      vi.advanceTimersByTime(FLEE_MS);
      expect(a().x).toBe(5);

      vi.advanceTimersByTime(STEP_MS);

      expect(a().x).toBe(6);
    });
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

  describe("waiting for players (salles partagées)", () => {
    it("plays immediately when nobody put the room on hold (entraînement)", () => {
      const room = new GameRoom("solo", twoSpawnMap());
      const socket = fakeSocket();

      room.join("p1", "Testeur", socket);

      expect(room.isStarted).toBe(true);
      expect(lastMessage(socket).type).toBe("STATE");
    });

    it("announces the wait, its capacity and its deadline instead of a playable board", () => {
      const room = new GameRoom("duel", twoSpawnMap(), [], undefined, undefined, 2);
      const socket = fakeSocket();

      room.openForWaiting(Date.now() + 10_000);
      room.join("p1", "Alice", socket);

      const message = lastMessage(socket);
      expect(message.type).toBe("WAITING");
      expect(message.capacity).toBe(2);
      expect(message.players).toHaveLength(1);
      // Une durée, jamais une date : les deux horloges ne sont pas la même.
      expect(message.startsInMs).toBeGreaterThan(0);
      expect(message.startsInMs).toBeLessThanOrEqual(10_000);
    });

    it("refuses moves while the room is still waiting", () => {
      const room = new GameRoom("duel", twoSpawnMap(), [], undefined, undefined, 2);
      const socket = fakeSocket();
      room.openForWaiting(Date.now() + 10_000);
      room.join("p1", "Alice", socket);
      const before = lastMessage(socket).players as { x: number; y: number }[];

      room.handle("p1", { type: "MOVE", direction: "RIGHT" });

      // Le joueur n'a pas bougé, et aucun STATE n'a été diffusé : la partie
      // n'a pas commencé, la touche ne doit rien faire.
      expect(lastMessage(socket).type).toBe("WAITING");
      expect(lastMessage(socket).players).toEqual(before);
    });

    it("accepts moves and broadcasts STATE once the game starts", () => {
      const room = new GameRoom("duel", twoSpawnMap(), [], undefined, undefined, 2);
      const socket = fakeSocket();
      room.openForWaiting(Date.now() + 10_000);
      room.join("p1", "Alice", socket);

      room.start();
      expect(lastMessage(socket).type).toBe("STATE");

      room.handle("p1", { type: "MOVE", direction: "RIGHT" });
      expect(lastMessage(socket).type).toBe("STATE");
    });

    it("counts seats and humans, so the matchmaker knows what is left to fill", () => {
      const room = new GameRoom("duel", twoSpawnMap(), [], undefined, undefined, 2);

      expect(room.freeSeats).toBe(2);
      expect(room.isFull).toBe(false);

      room.join("p1", "Alice", fakeSocket());
      expect(room.freeSeats).toBe(1);
      expect(room.humanCount).toBe(1);

      // Un bot occupe une place mais n'est pas un humain : c'est cette
      // distinction qui décide si une salle a encore quelqu'un à faire jouer.
      room.addBot("bot", "Bot");
      expect(room.freeSeats).toBe(0);
      expect(room.isFull).toBe(true);
      expect(room.humanCount).toBe(1);
    });

    it("ne facture pas l'attente à la durée de la partie", () => {
      // Pendant du test « chronomètre la partie… » : depuis les salles
      // partagées, le premier arrivant peut patienter dix secondes avant que
      // la partie parte. Ces secondes ne sont pas de la partie jouée.
      vi.useFakeTimers();
      try {
        const onEnd = vi.fn();
        const room = new GameRoom(
          "duel-attente",
          {
            width: 3,
            height: 1,
            tiles: [[Tile.Spawn, Tile.Empty, Tile.Goal]],
          },
          [],
          1,
          { mapName: "Sans nom", mode: "duel", onEnd },
          2,
        );

        room.openForWaiting(Date.now() + 10_000);
        room.join("p1", "Alice", fakeSocket());
        vi.advanceTimersByTime(10_000); // dix secondes à attendre un adversaire
        room.start();

        room.handle("p1", { type: "MOVE", direction: "RIGHT" });
        vi.advanceTimersByTime(STEP_MS);
        room.handle("p1", { type: "MOVE", direction: "RIGHT" }); // atteint le but

        expect(onEnd.mock.calls[0]![0].durationMs).toBe(STEP_MS);
      } finally {
        vi.useRealTimers();
      }
    });

    it("start() ne remet pas le chrono à zéro sur une partie déjà lancée", () => {
      // Le délai d'attente peut expirer APRÈS qu'une salle pleine soit partie
      // (voir matchmaking.ts) : ce réveil tardif ne doit rien réinitialiser.
      vi.useFakeTimers();
      try {
        const onEnd = vi.fn();
        const room = new GameRoom(
          "duel-double-depart",
          {
            width: 3,
            height: 1,
            tiles: [[Tile.Spawn, Tile.Empty, Tile.Goal]],
          },
          [],
          1,
          { mapName: "Sans nom", mode: "duel", onEnd },
          2,
        );

        room.join("p1", "Alice", fakeSocket());
        room.handle("p1", { type: "MOVE", direction: "RIGHT" });
        vi.advanceTimersByTime(STEP_MS);
        room.start(); // réveil tardif, la salle n'attendait pas
        room.handle("p1", { type: "MOVE", direction: "RIGHT" });

        expect(onEnd.mock.calls[0]![0].durationMs).toBe(STEP_MS);
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe("win condition (winScore)", () => {
    const mapWithGoal: GameMap = {
      width: 3,
      height: 1,
      tiles: [[Tile.Spawn, Tile.Empty, Tile.Goal]],
    };

    function scoreOnce(room: GameRoom) {
      room.handle("p1", { type: "MOVE", direction: "RIGHT" });
      vi.advanceTimersByTime(STEP_MS);
      room.handle("p1", { type: "MOVE", direction: "RIGHT" }); // (2,0) = Goal
      vi.advanceTimersByTime(STEP_MS);
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

    it("récompense le vainqueur connecté : son compte et ses pas, et le message n'est que pour lui", async () => {
      vi.useFakeTimers();
      try {
        const reward = vi.fn().mockResolvedValue({ type: "CHEST", outcome: "won", rarity: "or" });
        const room = new GameRoom("room-reward", mapWithGoal, [], 2 * POINTS_PER_BASE, {
          mapName: "#1 map 1v1",
          mode: "duel",
          onEnd: vi.fn(),
          reward,
        });
        const winner = fakeSocket();
        const other = fakeSocket();
        room.join("p1", "Alice", winner, "anon-1", [], "compte-alice");
        room.join("p2", "Bob", other, "anon-2");

        scoreOnce(room);
        scoreOnce(room);
        await vi.runAllTimersAsync();

        expect(reward).toHaveBeenCalledWith({
          accountId: "compte-alice",
          moves: expect.any(Number),
        });
        expect(reward.mock.calls[0]![0].moves).toBeGreaterThan(0);
        expect(lastMessage(winner)).toEqual({ type: "CHEST", outcome: "won", rarity: "or" });
        expect(lastMessage(other).type).toBe("END");
      } finally {
        vi.useRealTimers();
      }
    });

    it("ne récompense pas un vainqueur invité", () => {
      vi.useFakeTimers();
      try {
        const reward = vi.fn();
        const room = new GameRoom("room-guest", mapWithGoal, [], 2 * POINTS_PER_BASE, {
          mapName: "#1 map 1v1",
          mode: "duel",
          onEnd: vi.fn(),
          reward,
        });
        room.join("p1", "Invité", fakeSocket(), "anon-1");
        scoreOnce(room);
        scoreOnce(room);
        expect(reward).not.toHaveBeenCalled();
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
        expect(onEnd.mock.calls[0]![0].durationMs).toBe(STEP_MS);
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

describe("décompte de départ", () => {
  afterEach(() => vi.useRealTimers());

  it("refuse tout coup avant la fin, puis les accepte", () => {
    vi.useFakeTimers();
    const map: GameMap = { width: 2, height: 1, tiles: [[Tile.Spawn, Tile.Empty]] };
    const room = new GameRoom("countdown", map);
    const messages: { type: string; countdownMs?: number; players: { x: number }[] }[] = [];
    const socket = { send: (raw: string) => messages.push(JSON.parse(raw)) };
    room.join("p1", "Un", socket as never);

    room.startCountdown(3000);
    room.handle("p1", { type: "MOVE", direction: "RIGHT" });
    expect(messages.at(-1)).toMatchObject({ countdownMs: 3000, players: [{ x: 0 }] });

    vi.advanceTimersByTime(3000);
    room.handle("p1", { type: "MOVE", direction: "RIGHT" });
    expect(messages.at(-1)).toMatchObject({ countdownMs: 0, players: [{ x: 1 }] });
  });
});

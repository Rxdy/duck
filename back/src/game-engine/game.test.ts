import { describe, expect, it } from "vitest";
import { Tile, type GameMap } from "./tile.js";
import type { Player } from "./player.js";
import { applyMove, type GameState } from "./game.js";

function buildState(): GameState {
  const map: GameMap = {
    width: 3,
    height: 3,
    tiles: [
      [Tile.Spawn, Tile.Empty, Tile.Wall],
      [Tile.Empty, Tile.Empty, Tile.Empty],
      [Tile.Wall, Tile.Empty, Tile.Goal],
    ],
  };

  const player: Player = {
    id: "p1",
    name: "Duck",
    color: "yellow",
    accessory: "none",
    x: 0,
    y: 0,
    spawnX: 0,
    spawnY: 0,
    score: 0,
  };

  return { id: "game-1", map, players: [player] };
}

describe("applyMove", () => {
  it("moves the player when the target tile is walkable", () => {
    const state = buildState();
    const next = applyMove(state, "p1", "RIGHT");
    expect(next.players[0]).toMatchObject({ x: 1, y: 0 });
  });

  it("blocks movement into a wall", () => {
    const state = buildState();
    const next = applyMove(state, "p1", "UP");
    expect(next.players[0]).toMatchObject({ x: 0, y: 0 });
  });

  it("blocks movement outside the map bounds", () => {
    const state = buildState();
    const next = applyMove(state, "p1", "LEFT");
    expect(next.players[0]).toMatchObject({ x: 0, y: 0 });
  });

  it("scores and respawns the player when reaching the goal", () => {
    let state = buildState();
    state = applyMove(state, "p1", "RIGHT"); // (1,0)
    state = applyMove(state, "p1", "DOWN"); // (1,1)
    state = applyMove(state, "p1", "DOWN"); // (1,2)
    state = applyMove(state, "p1", "RIGHT"); // (2,2) -> Goal

    expect(state.players[0]).toMatchObject({ x: 0, y: 0, score: 1 });
  });

  it("only teleports the scorer back to their spawn — everyone else stays put", () => {
    const map: GameMap = {
      width: 3,
      height: 3,
      tiles: [
        [Tile.Spawn, Tile.Empty, Tile.Wall],
        [Tile.Empty, Tile.Empty, Tile.Empty],
        [Tile.Wall, Tile.Empty, Tile.Goal],
      ],
    };

    const scorer: Player = {
      id: "p1",
      name: "A",
      color: "red",
      accessory: "none",
      x: 1,
      y: 2,
      spawnX: 0,
      spawnY: 0,
      score: 0,
    };
    const bystander: Player = {
      id: "p2",
      name: "B",
      color: "blue",
      accessory: "none",
      x: 2,
      y: 1,
      spawnX: 2,
      spawnY: 0,
      score: 3,
    };

    let state: GameState = { id: "game-1", map, players: [scorer, bystander] };
    state = applyMove(state, "p1", "RIGHT"); // p1 (1,2) -> (2,2) = Goal

    const p1 = state.players.find((p) => p.id === "p1")!;
    const p2 = state.players.find((p) => p.id === "p2")!;

    expect(p1).toMatchObject({ x: 0, y: 0, score: 1 });
    // p2 n'a pas marqué : ni son score, ni sa position ne changent — la
    // partie continue pour lui sans interruption.
    expect(p2).toMatchObject({ x: 2, y: 1, score: 3 });
  });

  it("blocks movement onto a tile currently occupied by another player", () => {
    const state = buildState();
    const bot: Player = {
      id: "bot",
      name: "Bot",
      color: "cyan",
      accessory: "none",
      x: 1,
      y: 0,
      spawnX: 1,
      spawnY: 0,
      score: 0,
    };
    state.players.push(bot);

    const next = applyMove(state, "p1", "RIGHT"); // (0,0) -> (1,0), occupé par le bot

    expect(next.players.find((p) => p.id === "p1")).toMatchObject({ x: 0, y: 0 });
  });

  it("scores by reaching another player's individual base, without any Goal tile", () => {
    const map: GameMap = {
      width: 3,
      height: 1,
      tiles: [[Tile.Spawn, Tile.Empty, Tile.Spawn]],
    };
    const p1: Player = {
      id: "p1",
      name: "A",
      color: "red",
      accessory: "none",
      x: 1,
      y: 0,
      spawnX: 0,
      spawnY: 0,
      score: 0,
    };
    const p2: Player = {
      id: "p2",
      name: "B",
      color: "blue",
      accessory: "none",
      x: 0,
      y: 5, // hors de la case visée par p1, juste pour ne pas bloquer le déplacement
      spawnX: 2,
      spawnY: 0,
      score: 0,
    };

    let state: GameState = { id: "game-1", map, players: [p1, p2] };
    state = applyMove(state, "p1", "RIGHT"); // (1,0) -> (2,0) = base de p2

    expect(state.players.find((p) => p.id === "p1")).toMatchObject({ x: 0, y: 0, score: 1 });
  });

  it("does not score when walking back onto your own spawn", () => {
    const map: GameMap = {
      width: 2,
      height: 1,
      tiles: [[Tile.Spawn, Tile.Empty]],
    };
    const player: Player = {
      id: "p1",
      name: "A",
      color: "red",
      accessory: "none",
      x: 1,
      y: 0,
      spawnX: 0,
      spawnY: 0,
      score: 0,
    };

    let state: GameState = { id: "game-1", map, players: [player] };
    state = applyMove(state, "p1", "LEFT"); // retour sur SON propre spawn

    expect(state.players[0]).toMatchObject({ x: 0, y: 0, score: 0 });
  });
});

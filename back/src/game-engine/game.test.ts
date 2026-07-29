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

  it("resets every player to their own spawn when anyone scores (round ends)", () => {
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
    // p2 n'a pas marqué : score inchangé, mais renvoyé à SON spawn.
    expect(p2).toMatchObject({ x: 2, y: 0, score: 3 });
  });
});

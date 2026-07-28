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
});

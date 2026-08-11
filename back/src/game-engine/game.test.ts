import { describe, expect, it } from "vitest";
import { Tile, type GameMap } from "./tile.js";
import type { Player } from "./player.js";
import { applyMove, IMMUNITY_MS, isImmune, POINTS_PER_BASE, type GameState } from "./game.js";

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
    immuneUntil: 0,
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

  // Le cast est délibéré : il rejoue exactement ce que faisait le serveur avec
  // `JSON.parse(raw) as ClientMessage`. Le moteur doit rester debout même si
  // un appelant lui ment sur le type — sinon un simple message WebSocket tue
  // le process et toutes les parties en cours avec lui.
  it("ignores a direction that does not exist instead of throwing", () => {
    const state = buildState();
    const next = applyMove(state, "p1", "NE" as never);
    expect(next).toBe(state);
  });

  it("scores and respawns the player when reaching the goal", () => {
    let state = buildState();
    state = applyMove(state, "p1", "RIGHT"); // (1,0)
    state = applyMove(state, "p1", "DOWN"); // (1,1)
    state = applyMove(state, "p1", "DOWN"); // (1,2)
    state = applyMove(state, "p1", "RIGHT"); // (2,2) -> Goal

    expect(state.players[0]).toMatchObject({ x: 0, y: 0, score: POINTS_PER_BASE });
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
      immuneUntil: 0,
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
      immuneUntil: 0,
    };

    let state: GameState = { id: "game-1", map, players: [scorer, bystander] };
    state = applyMove(state, "p1", "RIGHT"); // p1 (1,2) -> (2,2) = Goal

    const p1 = state.players.find((p) => p.id === "p1")!;
    const p2 = state.players.find((p) => p.id === "p2")!;

    expect(p1).toMatchObject({ x: 0, y: 0, score: POINTS_PER_BASE });
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
      immuneUntil: 0,
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
      immuneUntil: 0,
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
      immuneUntil: 0,
    };

    let state: GameState = { id: "game-1", map, players: [p1, p2] };
    state = applyMove(state, "p1", "RIGHT"); // (1,0) -> (2,0) = base de p2

    expect(state.players.find((p) => p.id === "p1")).toMatchObject({
      x: 0,
      y: 0,
      score: POINTS_PER_BASE,
    });
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
      immuneUntil: 0,
    };

    let state: GameState = { id: "game-1", map, players: [player] };
    state = applyMove(state, "p1", "LEFT"); // retour sur SON propre spawn

    expect(state.players[0]).toMatchObject({ x: 0, y: 0, score: 0 });
  });
});

describe("toucher un adversaire", () => {
  function twoPlayers(overrides: Partial<Player> = {}): GameState {
    const map: GameMap = {
      width: 5,
      height: 1,
      tiles: [[Tile.Spawn, Tile.Empty, Tile.Empty, Tile.Empty, Tile.Spawn]],
    };
    const attacker: Player = {
      id: "p1",
      name: "A",
      color: "red",
      accessory: "none",
      x: 1,
      y: 0,
      spawnX: 0,
      spawnY: 0,
      score: 0,
      immuneUntil: 0,
    };
    const victim: Player = {
      id: "p2",
      name: "B",
      color: "blue",
      accessory: "none",
      x: 2,
      y: 0,
      spawnX: 4,
      spawnY: 0,
      score: 2,
      immuneUntil: 0,
      ...overrides,
    };
    return { id: "g", map, players: [attacker, victim] };
  }

  const NOW = 10_000;

  it("renvoie au spawn le joueur sur lequel on marche, et prend sa place", () => {
    const next = applyMove(twoPlayers(), "p1", "RIGHT", NOW);

    const victim = next.players.find((p) => p.id === "p2")!;
    expect(victim).toMatchObject({ x: 4, y: 0 });
    expect(next.players.find((p) => p.id === "p1")).toMatchObject({ x: 2, y: 0 });
  });

  it("vole un point à celui qui est touché, et le donne à l'attaquant", () => {
    const next = applyMove(twoPlayers(), "p1", "RIGHT", NOW);

    // Un vrai vol : l'attaquant gagne exactement ce que la victime perd, soit
    // 2 points d'écart au classement pour une seule action.
    expect(next.players.find((p) => p.id === "p2")!.score).toBe(1);
    expect(next.players.find((p) => p.id === "p1")!.score).toBe(1);
  });

  it("ne vole rien à un joueur qui n'a aucun point", () => {
    // Pas de score négatif, et s'acharner sur un joueur à zéro ne rapporte
    // rien : il faut aller marquer.
    const state = twoPlayers({ score: 0 });
    const next = applyMove(state, "p1", "RIGHT", NOW);

    expect(next.players.find((p) => p.id === "p2")!.score).toBe(0);
    expect(next.players.find((p) => p.id === "p1")!.score).toBe(0);
  });

  it("rend intouchable celui qui vient d'être renvoyé", () => {
    const next = applyMove(twoPlayers(), "p1", "RIGHT", NOW);
    const victim = next.players.find((p) => p.id === "p2")!;

    expect(isImmune(victim, NOW)).toBe(true);
    expect(isImmune(victim, NOW + IMMUNITY_MS)).toBe(false);
  });

  it("fait mur, sans renvoyer, quand la cible est immunisée", () => {
    // C'est ce qui règle le spawn kill : celui qui réapparaît ne peut pas
    // être cueilli sur place.
    const state = twoPlayers({ immuneUntil: NOW + 500 });
    const next = applyMove(state, "p1", "RIGHT", NOW);

    expect(next.players.find((p) => p.id === "p2")).toMatchObject({ x: 2, y: 0 });
    expect(next.players.find((p) => p.id === "p1")).toMatchObject({ x: 1, y: 0 });
  });

  it("empêche un joueur immunisé de toucher les autres", () => {
    // L'immunité est défensive : sinon réapparaître serait une arme gratuite
    // contre celui qui attend devant la base.
    const state = twoPlayers();
    state.players[0]!.immuneUntil = NOW + 500;
    const next = applyMove(state, "p1", "RIGHT", NOW);

    expect(next.players.find((p) => p.id === "p2")).toMatchObject({ x: 2, y: 0 });
    expect(next.players.find((p) => p.id === "p1")).toMatchObject({ x: 1, y: 0 });
  });

  it("protège aussi celui qui vient de marquer", () => {
    const state = twoPlayers();
    state.players[0]!.x = 3; // juste à côté de la base adverse (4,0)
    const next = applyMove(state, "p1", "RIGHT", NOW);

    const scorer = next.players.find((p) => p.id === "p1")!;
    expect(scorer).toMatchObject({ x: 0, y: 0, score: POINTS_PER_BASE });
    expect(isImmune(scorer, NOW)).toBe(true);
  });
});

describe("le campeur", () => {
  const NOW = 10_000;

  function camperState(): GameState {
    const map: GameMap = {
      width: 5,
      height: 1,
      tiles: [[Tile.Spawn, Tile.Empty, Tile.Empty, Tile.Empty, Tile.Spawn]],
    };
    return {
      id: "g",
      map,
      players: [
        // L'attaquant, juste devant la base adverse.
        {
          id: "attaquant",
          name: "A",
          color: "red",
          accessory: "none",
          x: 3,
          y: 0,
          spawnX: 0,
          spawnY: 0,
          score: 0,
          immuneUntil: 0,
        },
        // Le campeur, planté SUR sa propre base après avoir mené 1-0.
        {
          id: "campeur",
          name: "B",
          color: "blue",
          accessory: "none",
          x: 4,
          y: 0,
          spawnX: 4,
          spawnY: 0,
          score: 1,
          immuneUntil: 0,
        },
      ],
    };
  }

  it("ne protège pas sa base en se plantant dessus", () => {
    // Camper sa propre base ne bloque rien : l'attaquant entre, le renvoie
    // (chez lui, donc au même endroit) ET marque dans le même mouvement.
    const next = applyMove(camperState(), "attaquant", "RIGHT", NOW);

    // Base atteinte + vol dans le même mouvement : 3 + 1.
    expect(next.players.find((p) => p.id === "attaquant")!.score).toBe(POINTS_PER_BASE + 1);
    expect(next.players.find((p) => p.id === "campeur")!.score).toBe(0);
  });

  it("ne gagne rien à se faire toucher : il est déjà chez lui", () => {
    const next = applyMove(camperState(), "attaquant", "RIGHT", NOW);
    const camper = next.players.find((p) => p.id === "campeur")!;

    expect(camper).toMatchObject({ x: 4, y: 0 });
  });

  it("ne fait que retarder d'une immunité quand il vient de marquer", () => {
    // Seul cas où camper protège vraiment : la seconde et demie qui suit son
    // propre point. Après, la base redevient prenable.
    const state = camperState();
    state.players[1]!.immuneUntil = NOW + 500;

    const pendant = applyMove(state, "attaquant", "RIGHT", NOW);
    expect(pendant.players.find((p) => p.id === "attaquant")!.score).toBe(0);

    const apres = applyMove(state, "attaquant", "RIGHT", NOW + 600);
    expect(apres.players.find((p) => p.id === "attaquant")!.score).toBe(POINTS_PER_BASE + 1);
  });
});

import { describe, expect, it } from "vitest";
import { BOT_LEVELS, chooseBotDirection, firstStepTowards, type BotLevel } from "./bots.js";
import {
  applyMove,
  IMMUNITY_MS,
  Tile,
  type GameMap,
  type GameState,
  type Player,
} from "./game-engine/index.js";

const NOW = 10_000;

function player(id: string, x: number, y: number, spawn: [number, number]): Player {
  return {
    id,
    name: id,
    color: "#FF4D6D",
    accessory: "none",
    x,
    y,
    spawnX: spawn[0],
    spawnY: spawn[1],
    score: 0,
    immuneUntil: 0,
  };
}

/**
 * Petit piège : le couloir du haut part DANS LA BONNE DIRECTION mais ne mène
 * nulle part. Il tient entier dans la vue du plus faible des bots (6 cases,
 * voir BOT_LEVELS) : tous doivent donc le contourner.
 *
 *   #######
 *   #B...##   <- cul-de-sac
 *   #.#####
 *   #....T#
 *   #######
 */
function uMap(): GameMap {
  const W = Tile.Wall;
  const E = Tile.Empty;
  const S = Tile.Spawn;
  return {
    width: 7,
    height: 5,
    tiles: [
      [W, W, W, W, W, W, W],
      [W, S, E, E, E, W, W],
      [W, E, W, W, W, W, W],
      [W, E, E, E, E, S, W],
      [W, W, W, W, W, W, W],
    ],
  };
}

function uState(): GameState {
  return {
    id: "g",
    map: uMap(),
    players: [player("bot", 1, 1, [1, 1]), player("humain", 5, 3, [5, 3])],
  };
}

/**
 * Grand piège : le même leurre, mais à une échelle qui DÉPASSE la vue des bots
 * faibles. Le couloir du haut file vers la cible sur toute la largeur et ne
 * mène nulle part ; le vrai chemin commence par revenir en arrière, à gauche,
 * hors de vue. C'est ce qui sépare encore un débutant d'un expert une fois que
 * tous savent contourner un mur qu'ils voient.
 *
 *   ####################
 *   #........B........##   <- cul-de-sac sur toute la ligne
 *   #.##################
 *   #.................T#
 *   ####################
 */
function longTrapState(): GameState {
  const W = Tile.Wall;
  const E = Tile.Empty;
  const S = Tile.Spawn;
  const row = (open: number[]): Tile[] =>
    Array.from({ length: 20 }, (_, x) => (open.includes(x) ? E : W));
  const corridor = Array.from({ length: 18 }, (_, i) => i + 1);

  const tiles = [row([]), row(corridor), row([1]), row(corridor), row([])];
  tiles[1]![10] = S; // base du bot, au milieu du couloir leurre
  tiles[3]![18] = S; // base adverse, au bout du vrai chemin

  return {
    id: "g",
    map: { width: 20, height: 5, tiles },
    players: [player("bot", 10, 1, [10, 1]), player("humain", 18, 3, [18, 3])],
  };
}

describe("BOT_LEVELS", () => {
  it("garde tous les bots sous la vitesse d'un humain qui martèle la touche", () => {
    // Un humain culmine autour de 10-14 actions/s (voir docs/02-gameplay.md).
    // Un bot plus rapide ne se lirait pas comme fort, mais comme un tricheur.
    for (const [name, level] of Object.entries(BOT_LEVELS)) {
      expect(level.intervalMs, name).toBeGreaterThanOrEqual(120);
    }
  });

  it("classe les niveaux du plus lent au plus rapide, et du plus faible au plus fort", () => {
    const order: BotLevel[] = ["debutant", "intermediaire", "confirme", "expert", "impossible"];
    const intervals = order.map((l) => BOT_LEVELS[l].intervalMs);
    const ratings = order.map((l) => BOT_LEVELS[l].rating);
    const sight = order.map((l) => BOT_LEVELS[l].sightRadius);

    expect(intervals).toEqual([...intervals].sort((a, b) => b - a));
    expect(ratings).toEqual([...ratings].sort((a, b) => a - b));
    expect(sight).toEqual([...sight].sort((a, b) => a - b));
  });

  it("laisse tout bot voir au moins ses cases adjacentes", () => {
    // Une vue nulle rendrait le bot aveugle au mur d'à côté : il repartirait
    // en aller-retour, ce que sightRadius est justement là pour empêcher.
    for (const [name, level] of Object.entries(BOT_LEVELS)) {
      expect(level.sightRadius, name).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("firstStepTowards", () => {
  it("descend au lieu de s'enfermer dans le couloir qui va vers la cible", () => {
    const step = firstStepTowards(uState(), uState().players[0]!, { x: 5, y: 3 }, NOW);
    expect(step).toBe("DOWN");
  });

  it("ne renvoie rien quand la cible est enfermée", () => {
    const state = uState();
    state.map.tiles[3]![4] = Tile.Wall; // seule ouverture murée

    expect(firstStepTowards(state, state.players[0]!, { x: 5, y: 3 }, NOW)).toBeUndefined();
  });
});

describe("chooseBotDirection", () => {
  it("prend le vrai chemin avec un niveau qui en calcule un", () => {
    expect(chooseBotDirection(uState(), "bot", "confirme", NOW, () => 0)).toBe("DOWN");
  });

  it("contourne un mur qu'il voit, même au niveau le plus faible", () => {
    // Le piège tient dans les 6 cases que voit un débutant : il calcule un
    // vrai chemin dedans et descend. Avant, il visait la cible à vol d'oiseau,
    // partait à droite et faisait l'aller-retour indéfiniment — la partie ne
    // se terminait jamais.
    expect(chooseBotDirection(uState(), "bot", "debutant", NOW, () => 0)).toBe("DOWN");
    expect(chooseBotDirection(uState(), "bot", "intermediaire", NOW, () => 0)).toBe("DOWN");
  });

  it("se laisse piéger par un détour plus grand que sa vue", () => {
    // Ce n'est pas un défaut à corriger : c'est CE QUI REND un bas niveau
    // battable. Le couloir leurre file vers la cible bien au-delà de ce que
    // voit un intermédiaire (8 cases), qui s'y engage.
    expect(chooseBotDirection(longTrapState(), "bot", "intermediaire", NOW, () => 0)).toBe("RIGHT");
  });

  it("voit le piège en entier aux niveaux qui voient toute la carte", () => {
    // Même situation : un confirmé repart à gauche, à l'opposé de la cible,
    // parce que c'est le seul vrai chemin.
    expect(chooseBotDirection(longTrapState(), "bot", "confirme", NOW, () => 0)).toBe("LEFT");
  });

  it("finit toujours par atteindre la base adverse, à tous les niveaux", () => {
    // Le test qui manquait : un bot qui ne se bloque JAMAIS. Un adversaire
    // coincé contre un mur n'est pas un adversaire faible, c'est un adversaire
    // absent, et une partie qui ne se termine pas.
    for (const level of Object.keys(BOT_LEVELS) as BotLevel[]) {
      let state = uState();
      let scored = false;
      // Aléatoire figé sur "je fonce" : on mesure la décision, pas la chance.
      for (let step = 0; step < 100 && !scored; step++) {
        state = applyMove(
          state,
          "bot",
          chooseBotDirection(state, "bot", level, NOW, () => 0),
          NOW,
        );
        scored = state.players.find((p) => p.id === "bot")!.score > 0;
      }
      expect(scored, level).toBe(true);
    }
  });

  it("ne traverse jamais un joueur intouchable", () => {
    const state: GameState = {
      id: "g",
      map: {
        width: 4,
        height: 3,
        tiles: [
          [Tile.Wall, Tile.Wall, Tile.Wall, Tile.Wall],
          [Tile.Wall, Tile.Spawn, Tile.Empty, Tile.Spawn],
          [Tile.Wall, Tile.Wall, Tile.Wall, Tile.Wall],
        ],
      },
      players: [player("bot", 1, 1, [1, 1]), player("humain", 2, 1, [3, 1])],
    };
    state.players[1]!.immuneUntil = NOW + IMMUNITY_MS;

    // Le seul chemin est bloqué par un joueur immunisé : le bot ne doit pas
    // s'y jeter, il ne le renverrait pas et ne passerait pas.
    const step = chooseBotDirection(state, "bot", "expert", NOW, () => 0);
    expect(step).not.toBe("RIGHT");
  });

  it("marche volontiers sur un adversaire touchable, qui n'est plus un obstacle", () => {
    const state: GameState = {
      id: "g",
      map: {
        width: 5,
        height: 3,
        tiles: [
          [Tile.Wall, Tile.Wall, Tile.Wall, Tile.Wall, Tile.Wall],
          [Tile.Wall, Tile.Spawn, Tile.Empty, Tile.Empty, Tile.Spawn],
          [Tile.Wall, Tile.Wall, Tile.Wall, Tile.Wall, Tile.Wall],
        ],
      },
      players: [player("bot", 1, 1, [1, 1]), player("humain", 2, 1, [4, 1])],
    };

    expect(chooseBotDirection(state, "bot", "confirme", NOW, () => 0)).toBe("RIGHT");
  });

  it("rentre défendre quand l'adversaire menace sa base de plus près que lui", () => {
    const state: GameState = {
      id: "g",
      map: {
        width: 9,
        height: 3,
        tiles: [
          Array(9).fill(Tile.Wall),
          [
            Tile.Wall,
            Tile.Spawn,
            Tile.Empty,
            Tile.Empty,
            Tile.Empty,
            Tile.Empty,
            Tile.Empty,
            Tile.Spawn,
            Tile.Wall,
          ],
          Array(9).fill(Tile.Wall),
        ],
      },
      // Le bot est parti à l'attaque (x=6) ; l'humain (x=2) est presque sur
      // sa base à lui (x=1) : le laisser marquer coûterait plus cher que de
      // renoncer à son propre point.
      players: [player("bot", 6, 1, [1, 1]), player("humain", 2, 1, [7, 1])],
    };

    expect(chooseBotDirection(state, "bot", "expert", NOW, () => 0)).toBe("LEFT");
  });

  it("ignore la défense aux niveaux qui ne défendent pas", () => {
    const state: GameState = {
      id: "g",
      map: {
        width: 9,
        height: 3,
        tiles: [
          Array(9).fill(Tile.Wall),
          [
            Tile.Wall,
            Tile.Spawn,
            Tile.Empty,
            Tile.Empty,
            Tile.Empty,
            Tile.Empty,
            Tile.Empty,
            Tile.Spawn,
            Tile.Wall,
          ],
          Array(9).fill(Tile.Wall),
        ],
      },
      players: [player("bot", 6, 1, [1, 1]), player("humain", 2, 1, [7, 1])],
    };

    // Même situation : "confirmé" continue vers la base adverse (à droite).
    expect(chooseBotDirection(state, "bot", "confirme", NOW, () => 0)).toBe("RIGHT");
  });

  it("garde l'intention de gagner, même au niveau le plus faible", () => {
    // Un débutant n'est pas un canard ivre : il vise la base adverse la quasi-
    // totalité du temps. Sa faiblesse est ailleurs — lent, et myope.
    expect(BOT_LEVELS.debutant.chaseChance).toBeGreaterThanOrEqual(0.8);
    expect(chooseBotDirection(longTrapState(), "bot", "debutant", NOW, () => 0)).toBe("RIGHT");
  });

  it("hésite parfois au niveau le plus faible, sans jamais se bloquer", () => {
    // random() au-dessus de chaseChance : un pas au hasard, mais toujours
    // parmi les directions réellement jouables.
    const step = chooseBotDirection(uState(), "bot", "debutant", NOW, () => 0.99);
    expect(["DOWN", "RIGHT"]).toContain(step);
  });
});

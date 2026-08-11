import { describe, expect, it } from "vitest";
import {
  DEFAULT_VISIBLE_MATCHES,
  didWin,
  formatDuration,
  formatPlayedAt,
  meIn,
  modeLabel,
  type MatchRecap,
} from "./matchHistory.js";

function match(overrides: Partial<MatchRecap> = {}): MatchRecap {
  return {
    id: "m-1",
    mapName: "Carte",
    mode: "duel",
    durationMs: 90_000,
    playedAt: "2026-08-08T17:42:00.000Z",
    players: [
      { name: "Alice", color: "#FF4D6D", score: 15, isWinner: true, isMe: true },
      { name: "Bob", color: "#00C2D1", score: 9, isWinner: false, isMe: false },
    ],
    ...overrides,
  };
}

describe("modeLabel", () => {
  it("nomme les trois modes", () => {
    expect(modeLabel("duel", 2)).toBe("Duel");
    expect(modeLabel("ffa3", 3)).toBe("FFA 3 joueurs");
    expect(modeLabel("ffa4", 4)).toBe("FFA 4 joueurs");
  });

  it("retombe sur l'effectif quand le mode n'a pas été enregistré", () => {
    // Afficher "Duel" par défaut mentirait sur une partie à quatre.
    expect(modeLabel(null, 4)).toBe("Partie à 4");
    expect(modeLabel(null, 3)).toBe("Partie à 3");
  });

  it("ne s'effondre pas sur un mode inconnu du front", () => {
    // Le serveur peut livrer un mode avant que le front ne le connaisse.
    expect(modeLabel("ffa8", 8)).toBe("Partie à 8");
  });
});

describe("formatDuration", () => {
  it("écrit les courtes durées en secondes", () => {
    expect(formatDuration(48_000)).toBe("48 s");
    expect(formatDuration(1_400)).toBe("1 s");
  });

  it("aligne les secondes sur deux chiffres au-delà de la minute", () => {
    // Sinon "2 min 5 s" et "2 min 15 s" ne s'alignent pas dans une liste.
    expect(formatDuration(125_000)).toBe("2 min 05 s");
    expect(formatDuration(135_000)).toBe("2 min 15 s");
  });

  it("dit qu'une durée non mesurée est absente", () => {
    // "0 s" laisserait croire à une partie instantanée.
    expect(formatDuration(null)).toBe("—");
    expect(formatDuration(-1)).toBe("—");
  });
});

describe("formatPlayedAt", () => {
  const joue = new Date(2026, 7, 8, 19, 42).toISOString();

  it("dit « aujourd'hui » pour une partie du jour", () => {
    expect(formatPlayedAt(joue, new Date(2026, 7, 8, 23, 0))).toBe("Aujourd'hui à 19:42");
  });

  it("dit « hier » pour la veille", () => {
    expect(formatPlayedAt(joue, new Date(2026, 7, 9, 8, 0))).toBe("Hier à 19:42");
  });

  it("écrit la date en clair au-delà", () => {
    expect(formatPlayedAt(joue, new Date(2026, 7, 20, 8, 0))).toBe("8 août à 19:42");
  });

  it("n'ajoute l'année que si ce n'est plus la même", () => {
    expect(formatPlayedAt(joue, new Date(2027, 0, 5, 8, 0))).toBe("8 août 2026 à 19:42");
  });

  it("passe le changement de mois sans se tromper de « hier »", () => {
    const dernierJourDeJuillet = new Date(2026, 6, 31, 22, 10).toISOString();
    expect(formatPlayedAt(dernierJourDeJuillet, new Date(2026, 7, 1, 9, 0))).toBe("Hier à 22:10");
  });

  it("complète l'heure à deux chiffres", () => {
    const matin = new Date(2026, 7, 8, 9, 5).toISOString();
    expect(formatPlayedAt(matin, new Date(2026, 7, 8, 12, 0))).toBe("Aujourd'hui à 09:05");
  });

  it("ne rend pas « Invalid Date » sur une date illisible", () => {
    expect(formatPlayedAt("pas une date")).toBe("—");
  });
});

describe("meIn / didWin", () => {
  it("retrouve le joueur qui consulte", () => {
    expect(meIn(match())?.name).toBe("Alice");
  });

  it("dit s'il a gagné", () => {
    expect(didWin(match())).toBe(true);

    const perdue = match({
      players: [
        { name: "Bob", color: "#00C2D1", score: 15, isWinner: true, isMe: false },
        { name: "Alice", color: "#FF4D6D", score: 4, isWinner: false, isMe: true },
      ],
    });
    expect(didWin(perdue)).toBe(false);
  });

  it("ne s'appuie pas sur le score pour désigner le vainqueur", () => {
    // En cas d'égalité, c'est le serveur qui tranche : être premier au score
    // ne suffit pas.
    const egalite = match({
      players: [
        { name: "Alice", color: "#FF4D6D", score: 15, isWinner: false, isMe: true },
        { name: "Bob", color: "#00C2D1", score: 15, isWinner: true, isMe: false },
      ],
    });
    expect(didWin(egalite)).toBe(false);
  });

  it("supporte une partie où le consultant ne figure pas", () => {
    expect(meIn(match({ players: [] }))).toBeUndefined();
    expect(didWin(match({ players: [] }))).toBe(false);
  });
});

describe("DEFAULT_VISIBLE_MATCHES", () => {
  it("en montre trois avant de dérouler", () => {
    expect(DEFAULT_VISIBLE_MATCHES).toBe(3);
  });
});

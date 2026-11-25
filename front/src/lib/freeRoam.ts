/**
 * Mode libre du camp d'entraînement : une seule grande carte, quatre salles
 * reliées, aucune consigne ni limite. Mêmes règles que le tutoriel (voir
 * tutorial.ts), joué entièrement dans le navigateur.
 */
import type { Cell, Lesson } from "./tutorial.js";

export const FREE_MAP: Lesson = {
  key: "libre",
  title: "Mode libre",
  summary: "Explore quatre salles à ton rythme",
  intro: "",
  success: "",
  // 'A' départ, 'B' base à atteindre, 'R' canard immobile à toucher.
  rows: [
    "#########################",
    "#...#.....#.#...........#",
    "#.#.#.###.#.#...........#",
    "#.#...#...#.#...........#",
    "#.#####.###.#...........#",
    "#.....#...#.............#",
    "#####.###.#.#...........#",
    "#.........#.#...........#",
    "######..#####A####..#####",
    "#...........#...........#",
    "#..#..#..#..#...##.##...#",
    "#...........#...#...#...#",
    "#..#..#..#..........R.B.#",
    "#...........#...#...#...#",
    "#..#..#..#..#...##.##...#",
    "#...........#...........#",
    "#########################",
  ],
  rivalScore: 5,
  // Un score impossible à atteindre : la visite ne se termine jamais.
  tasks: [{ kind: "match", points: Infinity, text: "" }],
};

export function roomName({ x, y }: Cell): string {
  if (y === 8 || x === 12) return "Passage";
  if (y < 8) return x < 12 ? "Le labyrinthe" : "La grande salle";
  return x < 12 ? "La salle des piliers" : "L'arène";
}

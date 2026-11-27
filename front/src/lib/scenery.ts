/**
 * Décor de la carte. « Tactique » est le rendu sobre d'origine (cases grises, aucun décor) ; « paysage »
 * habille le sol et, plus tard, les murs. Le décor est purement visuel : il ne change ni les cases ni
 * les collisions, que le serveur seul décide.
 */
export type SceneryMode = "auto" | "tactique" | "paysage";
export type Scenery = "tactique" | "paysage";

export const SCENERY_MODES: readonly SceneryMode[] = ["auto", "tactique", "paysage"];

/** Auto : le paysage sur ordinateur, le rendu tactique (plus léger) sur un appareil tactile. */
export function resolveScenery(mode: SceneryMode, touchDevice: boolean): Scenery {
  if (mode === "auto") return touchDevice ? "tactique" : "paysage";
  return mode;
}

/**
 * Nombre pseudo-aléatoire entre 0 et 1 fixé par la case : tous les joueurs voient la même herbe, sans
 * que le serveur ait à la décrire, et elle ne bouge pas d'une image à l'autre.
 */
export function hash2(x: number, y: number, salt = 0): number {
  let h = Math.imul(x + 374761393, 668265263) ^ Math.imul(y + 1274126177, 2246822519);
  h = Math.imul(h ^ (h >>> 13) ^ Math.imul(salt + 1, 3266489917), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export interface Tuft {
  /** Position dans le plan du plateau (centre de la touffe). */
  x: number;
  z: number;
  scale: number;
  rotation: number;
}

/** De 0 à 4 touffes par case, jamais au bord de la case : l'herbe reste dans la sienne. */
export const MAX_TUFTS_PER_TILE = 4;

export function grassTufts(tiles: readonly { x: number; y: number }[]): Tuft[] {
  const tufts: Tuft[] = [];
  for (const { x, y } of tiles) {
    const count = Math.floor(hash2(x, y, 1) * (MAX_TUFTS_PER_TILE + 1));
    for (let i = 0; i < count; i++) {
      tufts.push({
        x: x + 0.15 + hash2(x, y, 10 + i) * 0.7,
        z: y + 0.15 + hash2(x, y, 20 + i) * 0.7,
        scale: 0.7 + hash2(x, y, 30 + i) * 0.6,
        rotation: hash2(x, y, 40 + i) * Math.PI * 2,
      });
    }
  }
  return tufts;
}

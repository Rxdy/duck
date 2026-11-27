import * as catalog from "./accessories/accessoires.js";

/** Les tenues complètes proposées par le catalogue : les thèmes, sans les affaires de Coincoin. */
function allThemes(): string[][] {
  return Object.entries(catalog)
    .filter(([name]) => name.startsWith("THEMES"))
    .flatMap(([, list]) => list as catalog.Outfit[])
    .map((theme) => [...theme.pieces]);
}

/**
 * `count` tenues différentes tirées au hasard, pour habiller le décor des pages : chaque visite
 * montre d'autres canards. `random` est injectable pour les tests.
 */
export function randomThemes(count: number, random: () => number = Math.random): string[][] {
  const pool = allThemes();
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  return pool.slice(0, count);
}

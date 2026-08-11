import { NearestFilter, SRGBColorSpace, TextureLoader, type Texture } from "three";
import frame from "../assets/ducks/frame.json";
import type { Facing } from "./board.js";

/**
 * Sprites du canard : le décor est en 3D isométrique, le personnage est une
 * image plate toujours face caméra (technique "Habbo", voir
 * organisms/DuckSprite.vue). Le dessin d'origine est rouge et décliné dans
 * chaque couleur de joueur EN AMONT, par scripts/generate-duck-sprites.py —
 * une image par couleur et par pose dans assets/ducks/<hex>/<pose>.png plutôt
 * qu'une reteinte dans le navigateur : le rendu est ainsi exactement celui
 * qu'on a validé à l'œil, sans travail au chargement de chaque partie.
 *
 * Les fichiers sont nommés d'après la POSE affichée (se/sw/ne/nw), pas d'après
 * l'orientation du dessin d'origine : quel dessin sert à quelle pose est un
 * choix artistique qui vit entièrement dans le script de génération (voir
 * frame.json#poses pour l'état courant). Seulement 4 poses : le déplacement
 * est orthogonal sur la grille, mais la caméra isométrique l'affiche en
 * diagonale à l'écran (voir board.ts#directionFacing).
 */

// Vite résout ces imports au build (URL finale avec hash) : rien n'est
// construit à la main à l'exécution, donc un fichier manquant se voit tout de
// suite ici plutôt que par un 404 en jeu.
const spriteUrls = import.meta.glob<string>("../assets/ducks/*/*.png", {
  eager: true,
  query: "?url",
  import: "default",
});

/** URLs par couleur (hex minuscule sans "#") puis par pose. */
const urlsByColor = new Map<string, Map<string, string>>();
for (const [path, url] of Object.entries(spriteUrls)) {
  const match = /\/ducks\/([0-9a-f]{6})\/(se|sw|ne|nw)\.png$/.exec(path);
  const color = match?.[1];
  const pose = match?.[2];
  if (!color || !pose) continue;

  const poses = urlsByColor.get(color) ?? new Map<string, string>();
  poses.set(pose, url);
  urlsByColor.set(color, poses);
}

function channels(color: string): [number, number, number] {
  return [
    parseInt(color.slice(0, 2), 16),
    parseInt(color.slice(2, 4), 16),
    parseInt(color.slice(4, 6), 16),
  ];
}

/**
 * Jeu de sprites correspondant à une couleur de joueur. Une couleur sans jeu
 * généré (palette du serveur modifiée sans avoir relancé le script, mode
 * daltonien étendu...) retombe sur la couleur générée la plus proche : un
 * canard de la mauvaise nuance reste infiniment plus jouable qu'un joueur
 * invisible.
 */
function closestColor(color: string): string | undefined {
  const normalized = color.replace("#", "").toLowerCase();
  if (urlsByColor.has(normalized)) return normalized;
  if (!/^[0-9a-f]{6}$/.test(normalized)) return urlsByColor.keys().next().value;

  const [r, g, b] = channels(normalized);
  let best: { color: string; distance: number } | undefined;
  for (const candidate of urlsByColor.keys()) {
    const [cr, cg, cb] = channels(candidate);
    const distance = (r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2;
    if (!best || distance < best.distance) best = { color: candidate, distance };
  }
  return best?.color;
}

/** URL du sprite pour une couleur de joueur et une direction affichée. */
export function duckSpriteUrl(color: string, facing: Facing): string | undefined {
  const resolved = closestColor(color);
  return resolved ? urlsByColor.get(resolved)?.get(facing) : undefined;
}

/**
 * Largeur / hauteur des PNG générés (toutes les poses partagent le même
 * cadrage). Écrit par le script de génération plutôt que recopié ici : le
 * cadrage change dès qu'on choisit d'autres dessins, et un sprite déformé
 * passerait inaperçu longtemps.
 */
export const DUCK_SPRITE_ASPECT = frame.width / frame.height;

const textures = new Map<string, Texture>();
const loader = new TextureLoader();

/**
 * Texture prête à plaquer sur le sprite, mémorisée par URL : les 4 joueurs
 * changent de direction en permanence, inutile de re-téléverser la même image
 * à la carte graphique à chaque pas. `undefined` si la couleur n'a aucun
 * sprite (voir duckSpriteUrl).
 */
export function duckTexture(color: string, facing: Facing): Texture | undefined {
  const url = duckSpriteUrl(color, facing);
  if (!url) return undefined;

  const existing = textures.get(url);
  if (existing) return existing;

  const texture = loader.load(url);
  // Pixel art : un filtrage linéaire baverait sur les contours noirs, qui
  // sont exactement ce qui fait tenir le style.
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.colorSpace = SRGBColorSpace;
  textures.set(url, texture);
  return texture;
}

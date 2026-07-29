import { mixHexColors } from "./board.js";
import type { AccessoryKind } from "./duckAccessories.js";

const WIDTH = 50;
const HEIGHT = 50;
const OUTLINE = 1.7;

const BEAK_COLOR = "#FFA51E";
const BEAK_DARK = "#C97A15";
const EYE_BLACK = "#0D0D0D";

/**
 * Un canard en aplats de couleur cernés d'un contour noir net, façon sprite
 * pixel art plaqué toujours face caméra (voir DuckSprite.vue) — technique
 * "Habbo" : le décor est en 3D isométrique, le personnage est une image
 * plate. Le déplacement se fait par téléportation case par case (voir
 * useKeyboardControls.ts et le protocole MOVE), jamais d'interpolation
 * continue : pas besoin d'un vrai jeu d'animation de marche.
 *
 * Seulement 2 dessins, pas 4 : la caméra isométrique (voir
 * computeIsometricFrame) est décalée à parts égales sur +X et +Z par
 * rapport au centre du plateau — se déplacer vers +X (RIGHT) ou vers +Z
 * (DOWN, puisque le monde Z correspond à la case y) rapproche donc TOUJOURS
 * le joueur de la caméra, et +X/+Z sont symétriques l'un de l'autre vus de
 * cette caméra. RIGHT et DOWN sont donc la même pose "qui s'approche", en
 * miroir l'une de l'autre (voir DuckSprite.vue) ; LEFT et UP l'éloignent
 * TOUJOURS, d'où une seule pose "de dos" pour les deux (inutile de la
 * retourner : elle est déjà symétrique, sans visage).
 *
 * Le contour noir (voir `outlined*`) est LA caractéristique qui fait lire
 * ce style comme un dessin graphique plutôt qu'une forme adoucie — chaque
 * forme est peinte deux fois, une copie noire légèrement agrandie derrière
 * puis la couleur réelle par-dessus ; pour une silhouette fusionnée
 * (tête+corps), les deux passes sont faites sur toutes les ellipses
 * concernées avant de passer à la suivante, pour qu'un chevauchement de
 * remplissages pleins ne laisse aucune couture interne.
 */
export type DuckView = "approach" | "back";

const cache = new Map<string, HTMLCanvasElement>();

export function duckSpriteAspect(): number {
  return WIDTH / HEIGHT;
}

export function drawDuckSprite(color: string, accessory: AccessoryKind, view: DuckView): HTMLCanvasElement {
  const key = `${color}|${accessory}|${view}`;
  const existing = cache.get(key);
  if (existing) return existing;

  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  // jsdom (tests) n'implémente pas le contexte 2D : le canevas reste vide,
  // sans planter (voir isWebglAvailable dans board.ts pour le même genre de
  // garde).
  if (!ctx) {
    cache.set(key, canvas);
    return canvas;
  }

  ctx.imageSmoothingEnabled = false;
  if (view === "approach") drawApproach(ctx, color, accessory);
  else drawBack(ctx, color, accessory);

  cache.set(key, canvas);
  return canvas;
}

/** Vue de dos : silhouette symétrique, sans visage (RIGHT et UP n'en montrent aucun). */
function drawBack(ctx: CanvasRenderingContext2D, color: string, accessory: AccessoryKind): void {
  const wingColor = mixHexColors(color, "#000000", 0.22);
  const wingHighlight = mixHexColors(color, "#ffffff", 0.4);

  // Pattes, derrière le corps.
  outlinedRect(ctx, 15, 38, 4, 10, BEAK_COLOR);
  outlinedRect(ctx, 31, 38, 4, 10, BEAK_COLOR);
  outlinedRect(ctx, 12, 46, 8, 4, BEAK_COLOR);
  outlinedRect(ctx, 28, 46, 8, 4, BEAK_COLOR);

  // Corps + tête, centrés (symétrique gauche/droite).
  fillEllipse(ctx, 25, 32, 15 + OUTLINE, 10.5 + OUTLINE, "#000000");
  fillEllipse(ctx, 25, 13, 11 + OUTLINE, 11 + OUTLINE, "#000000");
  fillEllipse(ctx, 25, 32, 15, 10.5, color);
  fillEllipse(ctx, 25, 13, 11, 11, color);

  // Ailes symétriques sur les deux flancs.
  outlinedEllipse(ctx, 11, 27, 6.2, 7.6, wingColor);
  outlinedEllipse(ctx, 39, 27, 6.2, 7.6, wingColor);
  fillEllipse(ctx, 9.5, 22, 1.9, 2.6, wingHighlight);
  fillEllipse(ctx, 40.5, 22, 1.9, 2.6, wingHighlight);

  drawAccessory(ctx, accessory, 25, 13);
}

/** Vue "qui s'approche" (RIGHT, miroir pour DOWN) : la pose "3/4" reconnaissable, un seul œil visible. */
function drawApproach(ctx: CanvasRenderingContext2D, color: string, accessory: AccessoryKind): void {
  const wingColor = mixHexColors(color, "#000000", 0.22);
  const wingHighlight = mixHexColors(color, "#ffffff", 0.4);

  outlinedRect(ctx, 14, 37, 4, 10, BEAK_COLOR);
  outlinedRect(ctx, 30, 37, 4, 10, BEAK_COLOR);
  outlinedRect(ctx, 11, 45, 8, 4, BEAK_COLOR);
  outlinedRect(ctx, 27, 45, 8, 4, BEAK_COLOR);

  fillEllipse(ctx, 23, 32, 12.9 + OUTLINE, 10.2 + OUTLINE, "#000000");
  fillEllipse(ctx, 22, 12, 10.2 + OUTLINE, 10.2 + OUTLINE, "#000000");
  fillEllipse(ctx, 23, 32, 12.9, 10.2, color);
  fillEllipse(ctx, 22, 12, 10.2, 10.2, color);

  outlinedEllipse(ctx, 11, 26, 8.6, 7.4, wingColor);
  fillEllipse(ctx, 9, 21, 2.6, 3, wingHighlight);

  outlinedPolygon(
    ctx,
    [
      [30, 18],
      [48, 22],
      [48, 29],
      [30, 30],
    ],
    BEAK_COLOR,
  );
  ctx.fillStyle = BEAK_DARK;
  ctx.fillRect(33, 23.5, 13, 1.6);

  // Œil : blanc + pupille (pas l'inverse) — un socle entièrement noir avec
  // un seul reflet lit comme un œil mort/vitreux plutôt qu'expressif.
  outlinedEllipse(ctx, 27, 17.5, 4.8, 5, "#FFFFFF");
  fillEllipse(ctx, 28.1, 18.6, 2.6, 2.8, EYE_BLACK);
  fillEllipse(ctx, 27, 16.7, 0.9, 1, "#FFFFFF");

  drawAccessory(ctx, accessory, 22, 12);
}

function fillEllipse(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function outlinedEllipse(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  color: string,
): void {
  fillEllipse(ctx, cx, cy, rx + OUTLINE, ry + OUTLINE, "#000000");
  fillEllipse(ctx, cx, cy, rx, ry, color);
}

function outlinedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = "#000000";
  ctx.fillRect(x - OUTLINE, y - OUTLINE, w + OUTLINE * 2, h + OUTLINE * 2);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function fillPolygon(ctx: CanvasRenderingContext2D, points: [number, number][], color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
  ctx.fill();
}

function outlinedPolygon(ctx: CanvasRenderingContext2D, points: [number, number][], color: string): void {
  const cx = points.reduce((sum, p) => sum + p[0], 0) / points.length;
  const cy = points.reduce((sum, p) => sum + p[1], 0) / points.length;
  const scale = 1 + OUTLINE / 6;
  const enlarged = points.map(([x, y]): [number, number] => [cx + (x - cx) * scale, cy + (y - cy) * scale]);
  fillPolygon(ctx, enlarged, "#000000");
  fillPolygon(ctx, points, color);
}

function drawAccessory(ctx: CanvasRenderingContext2D, accessory: AccessoryKind, headCx: number, headCy: number): void {
  const top = headCy - 10;
  if (accessory === "top-hat") {
    outlinedRect(ctx, headCx - 10, top - 6, 20, 3, "#111111");
    outlinedRect(ctx, headCx - 6, top - 12, 12, 7, "#111111");
  } else if (accessory === "cap") {
    outlinedRect(ctx, headCx - 10, top - 9, 20, 6, "#2563EB");
    outlinedRect(ctx, headCx + 6, top - 6, 9, 3, "#1D4ED8");
  } else if (accessory === "crown") {
    outlinedRect(ctx, headCx - 10, top - 6, 20, 3, "#FFD700");
    for (const dx of [-9, -3, 3, 8]) {
      outlinedPolygon(
        ctx,
        [
          [headCx + dx, top - 6],
          [headCx + dx + 3, top - 6],
          [headCx + dx + 1.5, top - 12],
        ],
        "#FFD700",
      );
    }
  }
}

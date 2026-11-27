/**
 * Fabrique les images fixes des scènes de saison (front/public/scenes/<scène>-gauche.png et -droite.png),
 * depuis le catalogue d'accessoires et les décors de front/src/lib/scenes. À relancer après toute
 * modification d'une scène ; les images sont commitées (le jeu n'a pas besoin de WebGL pour les afficher).
 *
 *   (cd front && npx vite --port 5180) &
 *   npm i --no-save playwright-core            # + un Chromium : npx playwright install chromium
 *   node scripts/render-scenes.mjs [scène]     # noel par défaut ; SERVER=http://localhost:5180
 */
import { mkdirSync } from "node:fs";
import { chromium } from "playwright-core";

const server = process.env.SERVER ?? "http://localhost:5180";
const scene = process.argv[2] ?? "noel";
const out = process.env.OUT
  ? new URL(`file://${process.env.OUT.replace(/\/?$/, "/")}`)
  : new URL("../front/public/scenes/", import.meta.url);
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM,
  args: [
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
  ],
});
const page = await browser.newPage({ viewport: { width: 1400, height: 1300 } });
for (const [side, name] of [
  [0, "gauche"],
  [1, "droite"],
]) {
  await page.goto(
    `${server}/atelier/scene.html?scene=${scene}&side=${side}&t=2.5`,
  );
  await page.waitForFunction(() => window.__done === true, null, {
    timeout: 60000,
  });
  const file = new URL(`${scene}-${name}.png`, out);
  await page.screenshot({ path: file.pathname, omitBackground: true });
  console.log("écrit", file.pathname);
}
await browser.close();

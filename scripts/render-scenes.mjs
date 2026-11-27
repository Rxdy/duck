/**
 * Fabrique l'image de fond de chaque saison (front/public/scenes/<scène>.jpg, 3200 x 1800), depuis le
 * catalogue d'accessoires et les décors de front/src/lib/scenes. À relancer après toute modification
 * d'une scène ; l'image est commitée (le jeu n'a pas besoin de WebGL pour l'afficher).
 *
 *   (cd front && npx vite --port 5180) &
 *   npm i --no-save playwright-core            # + un Chromium : npx playwright install chromium
 *   node scripts/render-scenes.mjs [scène]     # noel par défaut ; SERVER, CHROMIUM, OUT en option
 */
import { mkdirSync } from "node:fs";
import { chromium } from "playwright-core";

const server = process.env.SERVER ?? "http://localhost:5180";
const scene = process.argv[2] ?? "noel";
const out =
  process.env.OUT ??
  new URL("../front/public/scenes/", import.meta.url).pathname;
const [width, height] = [3200, 1800];
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
const page = await browser.newPage({ viewport: { width, height } });
page.on("pageerror", (error) => console.error("page :", error.message));
await page.goto(
  `${server}/atelier/scene.html?scene=${scene}&w=${width}&h=${height}&t=2.5`,
);
await page.waitForFunction(() => window.__done === true, null, {
  timeout: 120000,
});
const file = `${out.replace(/\/$/, "")}/${scene}.jpg`;
await page.screenshot({ path: file, type: "jpeg", quality: 84 });
console.log("écrit", file);
await browser.close();

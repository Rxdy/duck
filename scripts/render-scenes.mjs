/**
 * Fabrique les images de fond des événements (front/public/scenes/<édition>/<page>-<format>.jpg), depuis le
 * catalogue d'accessoires et les éditions de front/src/lib/scenes. À relancer après toute modification
 * d'une édition ; les images sont commitées (le jeu n'a pas besoin de WebGL pour les afficher, et un
 * test échoue si l'une manque).
 *
 *   (cd front && npx vite --port 5180) &
 *   npm i --no-save playwright-core            # + un Chromium : npx playwright install chromium
 *   node scripts/render-scenes.mjs [édition [page [format]]]     # tout par défaut ; SERVER, CHROMIUM, OUT en option
 */
import { mkdirSync } from "node:fs";
import { chromium } from "playwright-core";

const server = process.env.SERVER ?? "http://localhost:5180";
const [only, onlyPage, onlyDevice] = process.argv.slice(2);
const out = (
  process.env.OUT ??
  new URL("../front/public/scenes/", import.meta.url).pathname
).replace(/\/$/, "");

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM,
  args: [
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
  ],
});
const page = await browser.newPage();
page.on("pageerror", (error) => console.error("page :", error.message));

// La liste des compositions vient du code lui-même : rien à tenir à jour ici.
await page.goto(`${server}/atelier/scene-list.html`);
await page.waitForFunction(() => window.__list, null, { timeout: 60000 });
const list = await page.evaluate(() => window.__list);

for (const { edition, page: kind, device, width, height } of list) {
  if (
    (only && edition !== only) ||
    (onlyPage && kind !== onlyPage) ||
    (onlyDevice && device !== onlyDevice)
  )
    continue;
  await page.setViewportSize({ width, height });
  await page.goto(
    `${server}/atelier/scene.html?edition=${edition}&page=${kind}&device=${device}&t=2.5`,
  );
  await page.waitForFunction(() => window.__done === true, null, {
    timeout: 120000,
  });
  mkdirSync(`${out}/${edition}`, { recursive: true });
  const file = `${out}/${edition}/${kind}-${device}.jpg`;
  await page.screenshot({ path: file, type: "jpeg", quality: 84 });
  console.log("écrit", file);
}
await browser.close();

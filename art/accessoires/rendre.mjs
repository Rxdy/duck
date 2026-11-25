/**
 * Rend chaque accessoire de face et de dos, puis assemble les planches.
 *
 *   (cd front && npx vite --port 5180) &
 *   node art/accessoires/rendre.mjs
 *
 * Playwright n'est pas une dépendance du dépôt : indiquer son chemin au besoin
 * avec PLAYWRIGHT=/chemin/vers/node_modules/playwright/index.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const { chromium } = await import(process.env.PLAYWRIGHT ?? "playwright");
const ICI = dirname(fileURLToPath(import.meta.url));
const SORTIE = join(ICI, "rendus");
const URL_ATELIER = process.env.ATELIER ?? "http://localhost:5180/atelier/";
mkdirSync(SORTIE, { recursive: true });

const navigateur = await chromium.launch({
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const page = await navigateur.newPage({ viewport: { width: 360, height: 360 } });
page.on("pageerror", (e) => {
  console.error(e.message);
  process.exitCode = 1;
});

async function rendre(pieces, vue) {
  await page.goto(`${URL_ATELIER}?a=${pieces.join(",")}&v=${vue}`);
  await page.waitForFunction("window.catalogue", null, { timeout: 60000 });
  return page.screenshot({ omitBackground: true });
}

await rendre([], "face");
const { ACCESSOIRES, TENUES } = await page.evaluate("window.catalogue");
const groupes = [
  ["tete", "Tête (les antennes sont masquées)", ACCESSOIRES.filter((a) => a.emplacement === "tete")],
  ["visage-corps", "Visage et corps", ACCESSOIRES.filter((a) => ["visage", "corps"].includes(a.emplacement))],
  ["dos-tenues", "Dos, et tenues combinées", [...ACCESSOIRES.filter((a) => a.emplacement === "dos"), ...TENUES]],
];

for (const [fichier, titre, elements] of groupes) {
  const cartes = [];
  for (const element of elements) {
    const images = [];
    for (const vue of ["face", "dos"]) {
      const png = await rendre(element.pieces ?? [element.id], vue);
      writeFileSync(join(SORTIE, `${element.id}-${vue}.png`), png);
      images.push(`<img width="200" src="data:image/png;base64,${png.toString("base64")}">`);
    }
    cartes.push(`<figure><figcaption>${element.nom}</figcaption>${images.join("")}</figure>`);
  }
  const planche = await navigateur.newPage({ viewport: { width: 1272, height: 200 } });
  await planche.setContent(`<style>body{margin:0;padding:12px;background:#0f1218;color:#f1f5f9;font:600 17px system-ui}
    h1{margin:6px 4px 14px;font-size:24px}div{display:flex;flex-wrap:wrap;gap:12px}
    figure{margin:0;width:404px;background:#1a1e27;border:1px solid #2a313c;border-radius:14px;text-align:center}
    figcaption{padding-top:10px}</style><h1>${titre} — face et dos</h1><div>${cartes.join("")}</div>`);
  await planche.screenshot({ path: join(ICI, `planche-${fichier}.png`), fullPage: true });
  await planche.close();
}

const total = ACCESSOIRES.length;
console.log(`${total} accessoires et ${TENUES.length} tenues rendus`);
await navigateur.close();

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
// Les rendus sont des fichiers d'atelier : on les regarde, on ne les commite pas ici.
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

async function rendre(pieces, vue, couleur = "FF4D6D") {
  await page.goto(`${URL_ATELIER}?a=${pieces.join(",")}&v=${vue}&c=${couleur}`);
  await page.waitForFunction("window.catalogue", null, { timeout: 60000 });
  return page.screenshot({ omitBackground: true });
}

await rendre([], "face");
const { ACCESSOIRES, TENUES, THEMES, THEMES_LOT1, THEMES_LOT2, THEMES_LOT3, THEMES_LOT4, THEMES_LOT5 } = await page.evaluate("window.catalogue");

// Un thème ne doit pas mettre deux accessoires au même emplacement : on le signale.
for (const tenue of [...TENUES, ...THEMES, ...THEMES_LOT1, ...THEMES_LOT2, ...THEMES_LOT3, ...THEMES_LOT4, ...THEMES_LOT5]) {
  const places = tenue.pieces.map((id) => ACCESSOIRES.find((a) => a.id === id)?.emplacement);
  if (places.includes(undefined) || new Set(places).size !== places.length) {
    console.error(`Tenue invalide : ${tenue.nom} (${places.join(", ")})`);
    process.exitCode = 1;
  }
}
const de = (...places) => ACCESSOIRES.filter((a) => places.includes(a.emplacement));
const groupes = [
  ["tete", "Tête (les antennes sont masquées)", de("tete")],
  ["visage-corps", "Visage et corps", de("visage", "corps")],
  ["mains", "Dans la main", de("main")],
  ["dos-tenues", "Dos, et premières tenues", [...de("dos"), ...TENUES]],
  ["themes", "Tenues par thème", THEMES],
  ["lot1", "Lot 1, ninja et pharaon refaits", THEMES_LOT1],
  ["lot2", "Lot 2", THEMES_LOT2],
  ["lot3", "Lot 3", THEMES_LOT3],
  ["lot4", "Lot 4", THEMES_LOT4],
  ["lot5", "Lot 5 : nouvelles idées", THEMES_LOT5],
];

for (const [fichier, titre, elements] of groupes.filter(([f]) => !process.env.LOT || f === process.env.LOT)) {
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
// À la taille réelle du jeu sur téléphone : ce qui reste lisible une fois petit.
const vignettes = [];
for (const element of [...THEMES_LOT1, ...THEMES_LOT2, ...THEMES_LOT3, ...THEMES_LOT4, ...THEMES_LOT5]) {
  const png = await rendre(element.pieces ?? [element.id], "face");
  vignettes.push(`<figure><img width="64" src="data:image/png;base64,${png.toString("base64")}"><figcaption>${element.nom}</figcaption></figure>`);
}
const petit = await navigateur.newPage({ viewport: { width: 900, height: 200 } });
await petit.setContent(`<style>body{margin:0;padding:10px;background:#2e3643;color:#f1f5f9;font:11px system-ui;display:flex;flex-wrap:wrap;gap:8px}
  figure{margin:0;width:90px;text-align:center}</style>${vignettes.join("")}`);
await petit.screenshot({ path: join(ICI, "planche-taille-reelle.png"), fullPage: true });

// Reconnaît-on encore le joueur ? Les lots vus de dos sur un canard cyan.
const cyan = [];
for (const element of [...THEMES_LOT1, ...THEMES_LOT2, ...THEMES_LOT3, ...THEMES_LOT4, ...THEMES_LOT5]) {
  const png = await rendre(element.pieces, "dos", "00C2D1");
  cyan.push(`<figure><img width="150" src="data:image/png;base64,${png.toString("base64")}"><figcaption>${element.nom}</figcaption></figure>`);
}
const controle = await navigateur.newPage({ viewport: { width: 1272, height: 200 } });
await controle.setContent(`<style>body{margin:0;padding:10px;background:#0f1218;color:#f1f5f9;font:12px system-ui;display:flex;flex-wrap:wrap;gap:6px}
  figure{margin:0;width:150px;text-align:center}</style>${cyan.join("")}`);
await controle.screenshot({ path: join(ICI, "planche-couleur-joueur.png"), fullPage: true });

console.log(`${total} accessoires, ${TENUES.length + THEMES.length + THEMES_LOT1.length + THEMES_LOT2.length + THEMES_LOT3.length + THEMES_LOT4.length + THEMES_LOT5.length} tenues rendus`);
await navigateur.close();

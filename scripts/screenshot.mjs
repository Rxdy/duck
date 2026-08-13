#!/usr/bin/env node
/**
 * Capture une page de l'application dans un navigateur sans écran, AVEC WebGL.
 *
 * Pourquoi ce script existe : tout le rendu du jeu passe par WebGL (plateau,
 * vignettes de « Mes cartes », éditeur), et les tests unitaires n'en exercent
 * que le chemin de repli — jsdom n'a pas de contexte 3D. Un rendu pouvait donc
 * être cassé sans qu'aucun test ne bronche, et sans qu'on puisse le constater
 * autrement qu'en ouvrant le navigateur à la main.
 *
 * Le Chromium de Playwright embarque SwiftShader (Vulkan logiciel) : il rend
 * la 3D sans carte graphique, donc sur une machine de dev sans écran comme en
 * CI. C'est ce qui a permis de constater que les vignettes se dessinaient
 * bien, et de mesurer que l'ombre portée du plateau ne dessinait, elle, rien
 * du tout (voir front/src/lib/board.ts#SUN_POSITION).
 *
 * Usage (l'application doit tourner — `make dev`) :
 *
 *   node scripts/screenshot.mjs <url> <sortie.png> [options]
 *
 *   --token=<jeton>   session ouverte dans localStorage avant la capture
 *   --user=<pseudo>   pseudo associé au jeton (défaut : le jeton lui-même)
 *   --size=<LxH>      format de fenêtre (défaut : 430x932, un téléphone)
 *   --wait=<sel>      attend ce sélecteur CSS avant de capturer
 *   --full            capture toute la page, pas seulement la fenêtre
 *
 * Sortie : un JSON sur stdout (sélecteur attendu trouvé ou non, erreurs de
 * console) — ce qui rend le script utilisable dans un enchaînement, pas
 * seulement à l'œil.
 */
import { spawn } from "node:child_process";
import { existsSync, readdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const DEBUG_PORT = 9333;
const DEFAULT_SIZE = { width: 430, height: 932 };

/**
 * Chromium utilisable. Playwright installe les siens sous ~/.cache, versionnés :
 * on prend le plus récent plutôt qu'une version en dur, qui périmerait à la
 * première mise à jour. À défaut, un Chrome du système.
 */
function findChrome() {
  const cache = join(homedir(), ".cache", "ms-playwright");
  if (existsSync(cache)) {
    const builds = readdirSync(cache)
      .filter((name) => name.startsWith("chromium-"))
      .sort((a, b) => Number(b.split("-")[1]) - Number(a.split("-")[1]));
    for (const build of builds) {
      for (const dir of ["chrome-linux64", "chrome-linux"]) {
        const binary = join(cache, build, dir, "chrome");
        if (existsSync(binary)) return binary;
      }
    }
  }
  for (const binary of [
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome",
  ]) {
    if (existsSync(binary)) return binary;
  }
  return undefined;
}

function parseArgs(argv) {
  const positional = argv.filter((a) => !a.startsWith("--"));
  const flag = (name) => argv.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=");
  const size = flag("size")?.split("x").map(Number);

  return {
    url: positional[0],
    out: positional[1],
    token: flag("token"),
    user: flag("user") ?? flag("token"),
    wait: flag("wait"),
    full: argv.includes("--full"),
    size: size?.length === 2 ? { width: size[0], height: size[1] } : DEFAULT_SIZE,
  };
}

const options = parseArgs(process.argv.slice(2));
if (!options.url || !options.out) {
  console.error("Usage : node scripts/screenshot.mjs <url> <sortie.png> [options]");
  process.exit(2);
}

const chromePath = findChrome();
if (!chromePath) {
  console.error(
    "Aucun Chromium trouvé. Installe-le avec :\n" +
      "  npx playwright install chromium\n" +
      "ou installe chromium/google-chrome sur le système.",
  );
  process.exit(2);
}

const chrome = spawn(
  chromePath,
  [
    "--headless=new",
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--hide-scrollbars",
    // SwiftShader : rendu 3D purement logiciel. Sans ces trois options,
    // Chromium refuse WebGL sur une machine sans GPU et la page tombe sur son
    // chemin de repli — on capturerait alors l'absence de rendu, pas le rendu.
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    `--remote-debugging-port=${DEBUG_PORT}`,
    "about:blank",
  ],
  { stdio: ["ignore", "ignore", "pipe"] },
);
let chromeStderr = "";
chrome.stderr.on("data", (chunk) => (chromeStderr += chunk));

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function debuggerUrl() {
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const response = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
      return (await response.json()).webSocketDebuggerUrl;
    } catch {
      await wait(250);
    }
  }
  throw new Error(`Chromium n'a pas ouvert son port de debug.\n${chromeStderr}`);
}

const socket = new WebSocket(await debuggerUrl());
await new Promise((resolve) => socket.addEventListener("open", resolve, { once: true }));

let nextId = 0;
const pending = new Map();
const consoleErrors = [];

socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);

  if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") {
    consoleErrors.push(message.params.args.map((a) => a.value ?? a.description).join(" "));
  }
  if (message.method === "Runtime.exceptionThrown") {
    consoleErrors.push(message.params.exceptionDetails.text);
  }

  const slot = pending.get(message.id);
  if (!slot) return;
  pending.delete(message.id);
  if (message.error) slot.reject(new Error(JSON.stringify(message.error)));
  else slot.resolve(message.result);
});

function send(method, params = {}, sessionId) {
  const id = ++nextId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  });
}

const { targetId } = await send("Target.createTarget", { url: "about:blank" });
const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
const page = (method, params) => send(method, params, sessionId);

await page("Page.enable");
await page("Runtime.enable");
await page("Emulation.setDeviceMetricsOverride", {
  width: options.size.width,
  height: options.size.height,
  deviceScaleFactor: 2,
  mobile: true,
});

// Une session doit être posée sur l'ORIGINE de l'application : localStorage est
// cloisonné par origine, donc l'écrire depuis about:blank n'aurait aucun effet.
if (options.token) {
  await page("Page.navigate", { url: new URL(options.url).origin });
  await wait(1500);
  const session = JSON.stringify({
    token: options.token,
    username: options.user,
    email: `${options.user}@example.invalid`,
  });
  await page("Runtime.evaluate", {
    expression: `localStorage.setItem("duck:session", ${JSON.stringify(session)})`,
  });
}

await page("Page.navigate", { url: options.url });

// Un rendu logiciel est lent : attendre un délai fixe capturerait souvent une
// page à moitié dessinée. On attend donc une CONDITION, avec un plafond.
let found = !options.wait;
for (let attempt = 0; attempt < 60 && !found; attempt++) {
  await wait(500);
  const { result } = await page("Runtime.evaluate", {
    expression: `!!document.querySelector(${JSON.stringify(options.wait)})`,
    returnByValue: true,
  });
  found = result.value === true;
}
if (!options.wait) await wait(3000);

const shot = await page("Page.captureScreenshot", {
  format: "png",
  captureBeyondViewport: options.full,
});
writeFileSync(options.out, Buffer.from(shot.data, "base64"));

console.log(JSON.stringify({ out: options.out, waitedFor: options.wait ?? null, found, consoleErrors }));

chrome.kill();
process.exit(consoleErrors.length > 0 || !found ? 1 : 0);

// Adresses du serveur (WebSocket et API HTTP), calculées à un seul endroit.
//
// - VITE_SERVER_WS_URL défini : on l'utilise tel quel (le HTTP en est déduit : ws -> http).
// - Sinon, en local (localhost) : le serveur de développement, ws://localhost:8080.
// - Sinon (production) : le serveur est sur le MÊME domaine que le site, derrière le reverse proxy, qui envoie
//   /ws et /api au serveur en retirant le préfixe. Une seule image sert donc partout, sans variable au build.

export interface ServerUrls {
  ws: string;
  http: string;
}

export interface PageLocation {
  protocol: string;
  hostname: string;
  host: string;
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
const DEV_SERVER = "localhost:8080";

export function resolveServerUrls(
  configuredWs: string | undefined,
  where: PageLocation | undefined,
): ServerUrls {
  if (configuredWs) {
    return { ws: configuredWs, http: configuredWs.replace(/^ws/, "http") };
  }
  if (!where || LOCAL_HOSTS.has(where.hostname)) {
    return { ws: `ws://${DEV_SERVER}`, http: `http://${DEV_SERVER}` };
  }
  const secure = where.protocol === "https:";
  return {
    ws: `${secure ? "wss" : "ws"}://${where.host}/ws`,
    http: `${where.protocol}//${where.host}/api`,
  };
}

const urls = resolveServerUrls(
  import.meta.env.VITE_SERVER_WS_URL,
  typeof window === "undefined" ? undefined : window.location,
);

export const WS_URL = urls.ws;
export const HTTP_URL = urls.http;

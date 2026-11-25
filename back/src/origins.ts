// Origines autorisées à parler au serveur (CORS pour l'API HTTP, contrôle à l'ouverture du WebSocket).
//
// ALLOWED_ORIGINS : liste d'origines séparées par des virgules, ex. « https://duck.rxdy.fr ».
// Non définie : seules les adresses de développement local sont acceptées.
// Une requête SANS en-tête Origin (outil en ligne de commande, test, sonde de santé) n'est pas un navigateur :
// elle passe, le contrôle d'origine ne protège que contre les pages web d'autres sites.

export const DEV_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
  "http://localhost:8081",
];

export function parseAllowedOrigins(raw: string | undefined): string[] {
  if (raw === undefined || raw.trim() === "") return DEV_ORIGINS;
  return raw
    .split(",")
    .map((o) => o.trim().replace(/\/+$/, ""))
    .filter((o) => o !== "");
}

export function isOriginAllowed(origin: string | undefined, allowed: readonly string[]): boolean {
  if (origin === undefined) return true;
  return allowed.includes("*") || allowed.includes(origin);
}

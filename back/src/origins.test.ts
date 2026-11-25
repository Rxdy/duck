import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { WebSocket, WebSocketServer } from "ws";
import { DEV_ORIGINS, isOriginAllowed, parseAllowedOrigins } from "./origins.js";

describe("parseAllowedOrigins", () => {
  it("non défini ou vide : origines de développement local seulement", () => {
    expect(parseAllowedOrigins(undefined)).toEqual(DEV_ORIGINS);
    expect(parseAllowedOrigins("  ")).toEqual(DEV_ORIGINS);
  });

  it("liste séparée par des virgules, espaces et « / » final retirés", () => {
    expect(parseAllowedOrigins("https://duck.rxdy.fr/, https://autre.fr ,,")).toEqual([
      "https://duck.rxdy.fr",
      "https://autre.fr",
    ]);
  });
});

describe("isOriginAllowed", () => {
  const allowed = ["https://duck.rxdy.fr"];

  it("origine listée : autorisée", () => {
    expect(isOriginAllowed("https://duck.rxdy.fr", allowed)).toBe(true);
  });

  it("autre site : refusée", () => {
    expect(isOriginAllowed("https://pirate.example", allowed)).toBe(false);
  });

  it("une origine qui commence pareil n'est pas la même (pas de préfixe)", () => {
    expect(isOriginAllowed("https://duck.rxdy.fr.pirate.example", allowed)).toBe(false);
    expect(isOriginAllowed("http://duck.rxdy.fr", allowed)).toBe(false);
  });

  it("pas d'en-tête Origin (client non navigateur) : autorisée", () => {
    expect(isOriginAllowed(undefined, allowed)).toBe(true);
  });

  it("« * » : tout est autorisé (à n'utiliser qu'en connaissance de cause)", () => {
    expect(isOriginAllowed("https://nimporte.quoi", ["*"])).toBe(true);
  });
});

describe("WebSocket : contrôle d'origine à l'ouverture", () => {
  let server: Server;
  afterEach(() => new Promise<void>((done) => server.close(() => done())));

  async function demarrer(allowed: string[]): Promise<number> {
    server = createServer();
    new WebSocketServer({
      server,
      verifyClient: ({ origin }: { origin?: string }) => isOriginAllowed(origin, allowed),
    });
    await new Promise<void>((ok) => server.listen(0, "127.0.0.1", ok));
    return (server.address() as AddressInfo).port;
  }

  const ouvre = (port: number, origin?: string) =>
    new Promise<"ouvert" | "refusé">((resolve) => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}`, origin ? { origin } : undefined);
      ws.on("open", () => {
        ws.close();
        resolve("ouvert");
      });
      ws.on("error", () => resolve("refusé"));
    });

  it("accepte l'origine du site, refuse un autre site, accepte l'absence d'origine", async () => {
    const port = await demarrer(["https://duck.rxdy.fr"]);
    expect(await ouvre(port, "https://duck.rxdy.fr")).toBe("ouvert");
    expect(await ouvre(port, "https://pirate.example")).toBe("refusé");
    expect(await ouvre(port)).toBe("ouvert");
  });
});

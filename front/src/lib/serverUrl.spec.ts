import { describe, expect, it } from "vitest";
import { resolveServerUrls } from "./serverUrl.js";

const page = (protocol: string, host: string) => ({
  protocol,
  host,
  hostname: host.split(":")[0]!,
});

describe("resolveServerUrls", () => {
  it("variable configurée : utilisée telle quelle, HTTP déduit (ws -> http, wss -> https)", () => {
    expect(resolveServerUrls("ws://serveur:9000", page("https:", "duck.rxdy.fr"))).toEqual({
      ws: "ws://serveur:9000",
      http: "http://serveur:9000",
    });
    expect(resolveServerUrls("wss://jeu.exemple.fr/ws", undefined)).toEqual({
      ws: "wss://jeu.exemple.fr/ws",
      http: "https://jeu.exemple.fr/ws",
    });
  });

  it.each(["localhost:5173", "localhost", "127.0.0.1:4173"])(
    "local (%s) : serveur de développement",
    (host) => {
      expect(resolveServerUrls(undefined, page("http:", host))).toEqual({
        ws: "ws://localhost:8080",
        http: "http://localhost:8080",
      });
    },
  );

  it("hors navigateur : serveur de développement", () => {
    expect(resolveServerUrls(undefined, undefined).ws).toBe("ws://localhost:8080");
  });

  it("production en https : wss et API sur le même domaine, préfixes /ws et /api", () => {
    expect(resolveServerUrls(undefined, page("https:", "duck.rxdy.fr"))).toEqual({
      ws: "wss://duck.rxdy.fr/ws",
      http: "https://duck.rxdy.fr/api",
    });
  });

  it("production en http (ex. réseau local) : ws, pas wss ; garde le port", () => {
    expect(resolveServerUrls(undefined, page("http:", "192.168.1.20:8081"))).toEqual({
      ws: "ws://192.168.1.20:8081/ws",
      http: "http://192.168.1.20:8081/api",
    });
  });
});

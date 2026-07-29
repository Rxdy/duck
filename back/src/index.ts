import { createServer, type IncomingMessage } from "node:http";
import { randomUUID } from "node:crypto";
import { WebSocketServer, type WebSocket } from "ws";
import type { ClientMessage } from "./protocol.js";
import { generateMap } from "./map-generator/index.js";
import { buildMapFromWire, parseWireSpawns } from "./mapWire.js";
import { GameRoom, type MatchContext } from "./room.js";
import { saveMapFile, type SavedMapPayload } from "./mapsStorage.js";
import { pickRandomOfficialMap } from "./officialMaps.js";
import { getMatchStats, recordMatch, type MatchResult } from "./db.js";
import {
  getAccountById,
  getAccountIdForToken,
  loginAccount,
  registerAccount,
  UsernameOrEmailAlreadyUsedError,
  validateCredentials,
} from "./auth.js";
import { equipSkin, getEquippedAccessory, listOwnedSkins } from "./skins.js";

const PORT = Number(process.env.PORT ?? 8080);

function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk: Buffer) => (body += chunk));
    req.on("end", () => {
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
  });
}

/** Token de session porté par `Authorization: Bearer <token>`, `undefined` si absent/mal formé. */
function bearerToken(req: IncomingMessage): string | undefined {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return undefined;
  return header.slice("Bearer ".length);
}

const httpServer = createServer((req, res) => {
  // Le front (port Vite séparé) et le back n'ont jamais la même origine, même
  // en local : sans ces en-têtes, fetch() depuis /creatif échouerait en CORS.
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    // "authorization" : requis par GET /me et GET /me/skins (token de
    // session en Bearer), sans quoi le préflight du navigateur refuse la
    // vraie requête avant même qu'elle ne parte.
    res.setHeader("Access-Control-Allow-Headers", "content-type, authorization");
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }

  if (req.url === "/maps" && req.method === "POST") {
    readJsonBody(req).then(
      (payload) => {
        try {
          const { file } = saveMapFile(payload as SavedMapPayload);
          res.writeHead(201, { "content-type": "application/json" });
          res.end(JSON.stringify({ file }));
        } catch {
          res.writeHead(400);
          res.end();
        }
      },
      () => {
        res.writeHead(400);
        res.end();
      },
    );
    return;
  }

  if (req.url === "/auth/register" && req.method === "POST") {
    readJsonBody(req).then(
      async (payload) => {
        const { username, email, password, anonId } = payload as {
          username?: unknown;
          email?: unknown;
          password?: unknown;
          anonId?: unknown;
        };
        if (
          typeof username !== "string" ||
          typeof email !== "string" ||
          typeof password !== "string"
        ) {
          res.writeHead(400);
          res.end();
          return;
        }

        const validationError = validateCredentials(username, email, password);
        if (validationError) {
          res.writeHead(400, { "content-type": "application/json" });
          res.end(JSON.stringify({ error: validationError }));
          return;
        }

        try {
          const result = await registerAccount(
            username,
            email,
            password,
            typeof anonId === "string" ? anonId : undefined,
          );
          res.writeHead(201, { "content-type": "application/json" });
          res.end(JSON.stringify(result));
        } catch (error) {
          if (error instanceof UsernameOrEmailAlreadyUsedError) {
            res.writeHead(409, { "content-type": "application/json" });
            res.end(
              JSON.stringify({ error: "Ce pseudo ou cette adresse email est déjà utilisé." }),
            );
            return;
          }
          console.error("Échec de l'inscription :", error);
          res.writeHead(500);
          res.end();
        }
      },
      () => {
        res.writeHead(400);
        res.end();
      },
    );
    return;
  }

  if (req.url === "/auth/login" && req.method === "POST") {
    readJsonBody(req).then(
      async (payload) => {
        // Le pseudo et l'email sont tous les deux uniques (voir
        // registerAccount) : l'un ou l'autre est accepté pour se connecter.
        const { identifier, password } = payload as { identifier?: unknown; password?: unknown };
        if (typeof identifier !== "string" || typeof password !== "string") {
          res.writeHead(400);
          res.end();
          return;
        }

        try {
          const result = await loginAccount(identifier, password);
          if (!result) {
            res.writeHead(401, { "content-type": "application/json" });
            res.end(JSON.stringify({ error: "Identifiant ou mot de passe incorrect." }));
            return;
          }
          res.writeHead(200, { "content-type": "application/json" });
          res.end(JSON.stringify(result));
        } catch (error) {
          console.error("Échec de la connexion :", error);
          res.writeHead(500);
          res.end();
        }
      },
      () => {
        res.writeHead(400);
        res.end();
      },
    );
    return;
  }

  if (req.url === "/me" && req.method === "GET") {
    const token = bearerToken(req);
    if (!token) {
      res.writeHead(401);
      res.end();
      return;
    }
    getAccountIdForToken(token)
      .then(async (accountId) => {
        const account = accountId ? await getAccountById(accountId) : undefined;
        if (!account) {
          res.writeHead(401);
          res.end();
          return;
        }
        const stats = account.anonId ? await getMatchStats(account.anonId) : { played: 0, won: 0 };
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ username: account.username, email: account.email, stats }));
      })
      .catch((error: unknown) => {
        console.error("Échec de la récupération du compte :", error);
        res.writeHead(500);
        res.end();
      });
    return;
  }

  if (req.url === "/me/skins" && req.method === "GET") {
    const token = bearerToken(req);
    if (!token) {
      res.writeHead(401);
      res.end();
      return;
    }
    getAccountIdForToken(token)
      .then(async (accountId) => {
        if (!accountId) {
          res.writeHead(401);
          res.end();
          return;
        }
        const owned = await listOwnedSkins(accountId);
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify(owned));
      })
      .catch((error: unknown) => {
        console.error("Échec de la récupération des skins :", error);
        res.writeHead(500);
        res.end();
      });
    return;
  }

  if (req.url === "/me/equip-skin" && req.method === "POST") {
    const token = bearerToken(req);
    if (!token) {
      res.writeHead(401);
      res.end();
      return;
    }
    readJsonBody(req).then(
      async (payload) => {
        const { skinId } = payload as { skinId?: unknown };
        if (typeof skinId !== "string") {
          res.writeHead(400);
          res.end();
          return;
        }
        try {
          const accountId = await getAccountIdForToken(token);
          if (!accountId) {
            res.writeHead(401);
            res.end();
            return;
          }
          const equipped = await equipSkin(accountId, skinId);
          if (!equipped) {
            res.writeHead(403, { "content-type": "application/json" });
            res.end(JSON.stringify({ error: "Ce skin n'est pas possédé par ce compte." }));
            return;
          }
          res.writeHead(200);
          res.end();
        } catch (error) {
          console.error("Échec du changement de skin :", error);
          res.writeHead(500);
          res.end();
        }
      },
      () => {
        res.writeHead(400);
        res.end();
      },
    );
    return;
  }

  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server: httpServer });
const rooms = new Map<string, GameRoom>();

// Premier à ce score gagne un Duel (voir docs/02-gameplay.md) — pas de fin de
// partie en mode entraînement (JOIN_TEST), volontairement en pratique libre.
const DUEL_WIN_SCORE = 5;

// Best-effort et non bloquant : la partie a déjà été annoncée aux joueurs
// (voir GameRoom#checkForWinner) quand ce callback se déclenche, une base
// indisponible ne doit jamais faire planter le serveur de jeu.
function recordMatchResult(result: MatchResult): void {
  recordMatch(result).catch((error: unknown) => {
    console.error("Échec de l'enregistrement de la partie :", error);
  });
}

/** "none" si pas connecté (pas de token) ou session invalide — jamais d'échec bloquant. */
async function resolveAccessory(token?: string): Promise<string> {
  if (!token) return "none";
  const accountId = await getAccountIdForToken(token);
  return accountId ? getEquippedAccessory(accountId) : "none";
}

wss.on("connection", (socket: WebSocket) => {
  const playerId = randomUUID();
  let currentRoom: GameRoom | null = null;
  let currentRoomId: string | null = null;

  socket.on("message", (raw) => {
    const message = JSON.parse(raw.toString()) as ClientMessage;

    if (message.type === "JOIN") {
      // Pas encore de vrai multijoueur (pas de salle partagée entre humains,
      // voir docs/08-roadmap.md) : chaque JOIN crée sa propre partie fraîche,
      // exactement comme JOIN_TEST. Réutiliser une salle partagée figée
      // (l'ancien "lobby" constant) causait deux bugs une fois qu'on
      // relançait une partie : le bot jamais vraiment nettoyé restait dans
      // la liste des joueurs et décalait l'attribution des couleurs (même
      // couleur que le nouvel arrivant), et la carte piochée à la toute
      // première partie ne changeait plus jamais ensuite.
      resolveAccessory(message.token)
        .then((accessory) => {
          currentRoomId = `duel-${randomUUID()}`;
          const official = pickRandomOfficialMap("duel");
          // Pas de carte officielle -> pas de nom fiable à enregistrer : la
          // partie se joue quand même, juste sans persistance pour cette fois.
          const matchContext: MatchContext | undefined = official
            ? { mapName: official.name, onEnd: recordMatchResult }
            : undefined;
          currentRoom = official
            ? new GameRoom(
                currentRoomId,
                official.map,
                official.spawns,
                DUEL_WIN_SCORE,
                matchContext,
              )
            : new GameRoom(
                currentRoomId,
                generateMap({ width: 12, height: 12, seed: Date.now() }),
                [],
                DUEL_WIN_SCORE,
              );
          rooms.set(currentRoomId, currentRoom);
          currentRoom.join(playerId, message.name, socket, message.anonId, accessory);
          socket.send(JSON.stringify(currentRoom.getMapMessage()));

          // Un bot par spawn restant (le joueur a déjà pris le premier) :
          // carte à 2 spawns -> 1 bot. Pas de carte officielle -> pas de bot
          // (le stub procédural n'a qu'un seul spawn, pas de base distincte).
          if (official) {
            for (let i = 1; i < official.spawns.length; i++) {
              currentRoom.addBot(randomUUID(), `Bot ${i}`);
            }
          }
        })
        .catch((error: unknown) => {
          console.error("Échec du JOIN :", error);
        });
      return;
    }

    if (message.type === "JOIN_TEST") {
      currentRoomId = `test-${randomUUID()}`;
      const map = buildMapFromWire(message.map);
      const spawns = parseWireSpawns(message.map.spawns, map);
      currentRoom = new GameRoom(currentRoomId, map, spawns);
      rooms.set(currentRoomId, currentRoom);
      currentRoom.join(playerId, "Testeur", socket);

      // Un bot par spawn restant (le joueur a déjà pris le premier) : 2
      // spawns posés -> 1 bot, 4 spawns posés -> 3 bots.
      for (let i = 1; i < spawns.length; i++) {
        currentRoom.addBot(randomUUID(), `Bot ${i}`);
      }
      return;
    }

    currentRoom?.handle(playerId, message);
  });

  socket.on("close", () => {
    currentRoom?.leave(playerId);
    // Chaque salle n'est utilisée que par cet unique humain (+ ses bots) :
    // une fois qu'il part, elle n'a plus aucune raison de persister en
    // mémoire pour le reste de la durée de vie du process.
    if (currentRoomId) rooms.delete(currentRoomId);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Duck server listening on :${PORT}`);
});

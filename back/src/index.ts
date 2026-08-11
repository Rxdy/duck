import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { WebSocketServer, type WebSocket } from "ws";
import type { ClientMessage, ServerMessage } from "./protocol.js";
import { parseClientMessage } from "./clientMessage.js";
import { buildMapFromWire, parseWireSpawns } from "./mapWire.js";
import { GameRoom, type MatchContext } from "./room.js";
import { saveMapFile, type SavedMapPayload } from "./mapsStorage.js";
import { listOfficialMaps, pickRandomOfficialMap } from "./officialMaps.js";
import { getMatchStats, listMatchesFor, recordMatch, type MatchResult } from "./db.js";
import {
  getAccountById,
  getAccountIdForToken,
  loginAccount,
  registerAccount,
  UsernameOrEmailAlreadyUsedError,
  validateCredentials,
} from "./auth.js";
import { equipSkin, getEquippedAccessory, listOwnedSkins } from "./skins.js";
import { deleteMapForAccount, listMapsForAccount, saveMapForAccount } from "./maps.js";
import {
  applyMatchRatings,
  getRatingForAnonId,
  listRankingFor,
  STARTING_RATING,
} from "./rating.js";
import { ensureBotPopulation, pickBotOpponents } from "./botAccounts.js";
import { DEFAULT_GAME_MODE, isGameMode, playerCountFor } from "./shared.js";
import { BOT_LEVELS, DEFAULT_BOT_LEVEL, isBotLevel } from "./bots.js";

const PORT = Number(process.env.PORT ?? 8080);

/**
 * Plafond du récapitulatif de la page Compte. Un joueur assidu accumulera des
 * centaines de parties : les envoyer toutes pour en afficher trois par défaut
 * gâcherait une connexion mobile. Cinquante couvre largement le "voir toutes
 * les parties" ; au-delà il faudra paginer.
 */
const MATCH_HISTORY_LIMIT = 50;

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
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
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

  // Cartes du joueur connecté. Sauvegarder exige un compte : une carte doit
  // avoir un propriétaire pour être retrouvée depuis n'importe quel appareil
  // (voir db/init/05-maps.sql). Le token dit QUI est le propriétaire — il
  // n'est jamais pris dans le corps de la requête, qui vient du client.
  if (req.url === "/me/maps" && req.method === "GET") {
    withAccount(req, res, async (accountId) => {
      const maps = await listMapsForAccount(accountId);
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ maps }));
    });
    return;
  }

  if (req.url === "/me/maps" && req.method === "POST") {
    withAccount(req, res, async (accountId) => {
      const payload = (await readJsonBody(req)) as {
        id?: unknown;
        name?: unknown;
        width?: unknown;
        height?: unknown;
        tiles?: unknown;
      };
      if (
        typeof payload?.name !== "string" ||
        typeof payload.width !== "number" ||
        typeof payload.height !== "number"
      ) {
        res.writeHead(400);
        res.end();
        return;
      }

      const saved = await saveMapForAccount(accountId, {
        id: typeof payload.id === "string" ? payload.id : undefined,
        name: payload.name,
        width: payload.width,
        height: payload.height,
        tiles: payload.tiles,
      });
      if (!saved) {
        // Grille invalide, ou carte appartenant à quelqu'un d'autre : dans
        // les deux cas le client n'a rien à savoir de plus.
        res.writeHead(400);
        res.end();
        return;
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(saved));
    });
    return;
  }

  if (req.url?.startsWith("/me/maps/") && req.method === "DELETE") {
    const mapId = req.url.slice("/me/maps/".length);
    withAccount(req, res, async (accountId) => {
      const deleted = await deleteMapForAccount(accountId, mapId);
      res.writeHead(deleted ? 204 : 404);
      res.end();
    });
    return;
  }

  // Cartes officielles : publiques et sans compte, elles ne sont qu'un aperçu
  // de ce que le matchmaking peut servir (voir front/src/pages/Play.vue).
  // Classement : public, sans compte — on doit pouvoir regarder qui domine
  // avant même de s'inscrire.
  if (req.url?.startsWith("/leaderboard") && req.method === "GET") {
    const params = new URL(req.url, "http://localhost").searchParams;
    listRankingFor(params.get("me") ?? undefined, 10, params.get("search") ?? undefined)
      .then((ranking) => {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify(ranking));
      })
      .catch((error: unknown) => {
        console.error("Échec de la lecture du classement :", error);
        res.writeHead(500);
        res.end();
      });
    return;
  }

  if (req.url === "/maps/official" && req.method === "GET") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ maps: listOfficialMaps() }));
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

  if (req.url === "/me/matches" && req.method === "GET") {
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
        // Sans identifiant anonyme, aucune partie ne peut être rattachée au
        // compte : liste vide plutôt qu'une erreur, il n'y a rien d'anormal.
        const recaps = account.anonId
          ? await listMatchesFor(account.anonId, MATCH_HISTORY_LIMIT)
          : [];
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify(recaps));
      })
      .catch((error: unknown) => {
        console.error("Échec de la récupération des parties :", error);
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

// Premier à ce score gagne, quel que soit le mode : les règles ne changent
// pas d'un mode à l'autre, seul le nombre de joueurs (voir
// docs/02-gameplay.md#modes-de-jeu). 15 = cinq bases atteintes (voir
// game-engine/game.ts#POINTS_PER_BASE), soit la même longueur de partie
// qu'avant le barème enrichi — les vols ne font que la texturer. Pas de fin
// de partie en mode entraînement (JOIN_TEST), volontairement en pratique libre.
const WIN_SCORE = 15;

// Best-effort et non bloquant : la partie a déjà été annoncée aux joueurs
// (voir GameRoom#checkForWinner) quand ce callback se déclenche, une base
// indisponible ne doit jamais faire planter le serveur de jeu.
function recordMatchResult(result: MatchResult): void {
  recordMatch(result).catch((error: unknown) => {
    console.error("Échec de l'enregistrement de la partie :", error);
  });
  // Le classement suit la même règle : jamais bloquant, jamais fatal.
  applyMatchRatings(result).catch((error: unknown) => {
    console.error("Échec de la mise à jour du classement :", error);
  });
}

/**
 * Exécute `handler` avec l'id du compte derrière le token de session, ou
 * répond 401. Toutes les routes /me/* partagent cette garde : c'est le token
 * qui décide de l'identité, jamais un champ envoyé par le client.
 */
function withAccount(
  req: IncomingMessage,
  res: ServerResponse,
  handler: (accountId: string) => Promise<void>,
): void {
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
      await handler(accountId);
    })
    .catch((error: unknown) => {
      console.error("Échec du traitement de la requête :", error);
      res.writeHead(500);
      res.end();
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

  function dispatch(message: ClientMessage): void {
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
        .then(async (accessory) => {
          const mode = isGameMode(message.mode) ? message.mode : DEFAULT_GAME_MODE;
          // Niveau des bots : demandé par le client (réglage/essai), sinon
          // celui par défaut. Le nom du bot le porte pour qu'on voie tout de
          // suite à qui on a affaire dans le score.
          const botLevel = isBotLevel(message.botLevel) ? message.botLevel : DEFAULT_BOT_LEVEL;
          // Le classement du joueur guide le choix des adversaires. Inconnu
          // (pas de compte) -> valeur de départ, donc des bots de niveau moyen.
          const playerRating = await getRatingForAnonId(message.anonId).catch(
            () => STARTING_RATING,
          );
          const playerCount = playerCountFor(mode);
          const official = pickRandomOfficialMap(playerCount);

          // Aucune carte à ce nombre de bases : on le DIT. Lancer la partie
          // sur une carte au mauvais format donnerait un mode qui ment
          // (un FFA à 4 joué à 2, par exemple).
          if (!official) {
            const error: ServerMessage = {
              type: "ERROR",
              message: `Aucune carte disponible pour ce mode (${playerCount} joueurs).`,
            };
            socket.send(JSON.stringify(error));
            return;
          }

          currentRoomId = `${mode}-${randomUUID()}`;
          const matchContext: MatchContext = {
            mapName: official.name,
            mode,
            onEnd: recordMatchResult,
          };
          currentRoom = new GameRoom(
            currentRoomId,
            official.map,
            official.spawns,
            WIN_SCORE,
            matchContext,
          );
          rooms.set(currentRoomId, currentRoom);
          currentRoom.join(playerId, message.name, socket, message.anonId, accessory);
          socket.send(JSON.stringify(currentRoom.getMapMessage()));

          // Un bot par base restante (le joueur a déjà pris la première) : le
          // mode décide du nombre de joueurs, la carte a été choisie pour
          // avoir exactement ce nombre de bases, donc duel -> 1 bot,
          // FFA 4 -> 3 bots. Ils seront remplacés par de vrais joueurs quand
          // le matchmaking existera (voir docs/08-roadmap.md).
          // Adversaires artificiels choisis dans la population de bots (voir
          // botAccounts.ts) : ce sont de vrais comptes, avec pseudo et
          // classement. Rien dans l'interface ne les distingue d'un humain.
          const seats = official.spawns.length - 1;
          const opponents = await pickBotOpponents(playerRating, seats).catch(() => []);
          for (let i = 0; i < seats; i++) {
            const bot = opponents[i];
            if (bot) {
              // Le niveau de jeu vient du COMPTE du bot, pas de son classement
              // (voir botAccounts.ts#levelOf) : son classement bouge avec ses
              // résultats, son intelligence non.
              currentRoom.addBot(randomUUID(), bot.username, bot.level, bot.anonId);
            } else {
              // Base injoignable : on complète quand même la partie plutôt
              // que de laisser le joueur seul sur le plateau.
              currentRoom.addBot(randomUUID(), `${BOT_LEVELS[botLevel].label} ${i + 1}`, botLevel);
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
  }

  socket.on("message", (raw) => {
    // Message refusé (JSON illisible, type inconnu, direction fantaisiste) :
    // ignoré sans bruit, voir clientMessage.ts pour le pourquoi du silence.
    const message = parseClientMessage(raw.toString());
    if (!message) return;

    // Le filtrage ci-dessus couvre ce qui est connu ; ce filet couvre le
    // reste. Une exception qui remonte d'ici n'est pas rattrapée par Node :
    // elle tue le process, et donc les parties de TOUS les joueurs connectés.
    // Le prix d'un message mal traité doit rester le message, pas le serveur.
    try {
      dispatch(message);
    } catch (error) {
      console.error("Message client ignoré (traitement impossible) :", error);
    }
  });

  // Sans écouteur, un « error » émis par ws (coupure brutale, trame invalide)
  // est relancé en exception non rattrapée et emporte le process. Une
  // connexion qui casse ne concerne que celui qui la perd : « close » suivra
  // et fera le ménage de la salle.
  socket.on("error", (error) => {
    console.error("Erreur de connexion WebSocket :", error);
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

  // Peuple la table de bots si elle ne l'est pas encore (idempotent). Sans
  // eux, un joueur seul n'a personne en face — et l'application a l'air vide.
  ensureBotPopulation()
    .then((created) => {
      if (created > 0) console.log(`${created} bots créés`);
    })
    .catch((error: unknown) => {
      console.error("Peuplement des bots impossible :", error);
    });
});

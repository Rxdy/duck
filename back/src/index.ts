import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { WebSocketServer, type WebSocket } from "ws";
import { isOriginAllowed, parseAllowedOrigins } from "./origins.js";
import type { ClientMessage, JoinTestMessage, ServerMessage } from "./protocol.js";
import { ACCOUNT_REQUIRED, isAllowed } from "./access.js";
import { parseClientMessage } from "./clientMessage.js";
import { buildMapFromWire, parseWireSpawns } from "./mapWire.js";
import { GameRoom, type MatchContext } from "./room.js";
import { saveMapFile, type SavedMapPayload } from "./mapsStorage.js";
import { listOfficialMaps, pickRandomOfficialMap } from "./officialMaps.js";
import {
  closeDb,
  DATABASE_URL,
  getMatchStats,
  listMatchesFor,
  recordMatch,
  type MatchResult,
} from "./db.js";
import { applySchemaWhenReady } from "./migrate.js";
import {
  getAccountById,
  getAccountIdForToken,
  loginAccount,
  registerAccount,
  EmailAlreadyUsedError,
  validateCredentials,
  loginWithGoogle,
  anonIdForAccount,
} from "./auth.js";
import { verifyGoogleCredential } from "./google.js";
import {
  CATALOG,
  dressBots,
  getOutfit,
  getWardrobe,
  giveRandomItem,
  savePreset,
  wearOutfit,
} from "./wardrobe.js";
import {
  copyPublicMap,
  deleteMapForAccount,
  listMapsForAccount,
  listPublicMaps,
  saveMapForAccount,
  setMapPublished,
} from "./maps.js";
import {
  applyMatchRatings,
  getRatingForAnonId,
  listRankingFor,
  STARTING_RATING,
} from "./rating.js";
import { ensureBotPopulation, pickBotOpponents } from "./botAccounts.js";
import { awardChest, listChests, openChest, startUnlock } from "./chests.js";
import { DEFAULT_GAME_MODE, isGameMode, playerCountFor, type GameMode } from "./shared.js";
import { BOT_LEVELS, DEFAULT_BOT_LEVEL, isBotLevel, type BotLevel } from "./bots.js";
import { COUNTDOWN_MS, Matchmaker } from "./matchmaking.js";
import { LobbyRegistry } from "./lobby.js";
import {
  acceptFriend,
  listFriends,
  removeFriend,
  requestFriend,
  findByCode,
  friendByCode,
} from "./friends.js";

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

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

const FRIEND_ACTIONS: Record<string, (accountId: string, tag: string) => Promise<unknown>> = {
  "/me/friends": requestFriend,
  "/me/friends/accept": acceptFriend,
  "/me/friends/remove": removeFriend,
};

const allowedOrigins = parseAllowedOrigins(process.env.ALLOWED_ORIGINS);
// Non défini : la connexion avec Google est désactivée, le front masque son bouton.
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || undefined;

const httpServer = createServer((req, res) => {
  // CORS : seules les origines autorisées (ALLOWED_ORIGINS, voir origins.ts) peuvent appeler l'API depuis un
  // navigateur. En local le front (port Vite) et le back n'ont pas la même origine ; en production ils sont
  // sur le même domaine, mais le WebSocket et les requêtes POST portent quand même un en-tête Origin.
  const origin = req.headers.origin;
  if (!isOriginAllowed(origin, allowedOrigins)) {
    res.writeHead(403, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "origin_not_allowed" }));
    return;
  }
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", allowedOrigins.includes("*") ? "*" : origin);
    res.setHeader("Vary", "Origin");
  }

  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    // "authorization" : requis par GET /me et les routes /me/* (token de
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

  // Coffres (voir chests.ts) : tout demande un compte.
  if (req.url === "/me/chests" && req.method === "GET") {
    withAccount(req, res, async (accountId) => {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ chests: await listChests(accountId) }));
    });
    return;
  }

  const chestAction = req.url?.match(/^\/me\/chests\/([0-9a-f-]{36})\/(unlock|open)$/);
  if (chestAction && req.method === "POST") {
    const [, chestId, action] = chestAction;
    withAccount(req, res, async (accountId) => {
      const result =
        action === "unlock"
          ? await startUnlock(accountId, chestId!)
          : await openChest(accountId, chestId!);
      if (!result.ok) {
        // 404 : pas ce coffre ; 409 : une autre ouverture en cours, ou pas encore prêt.
        res.writeHead(result.reason === "not-found" ? 404 : 409, {
          "content-type": "application/json",
        });
        res.end(JSON.stringify({ reason: result.reason }));
        return;
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(result));
    });
    return;
  }

  // Galerie (#33) : la liste se lit sans compte ; publier ou copier en demande un.
  if (req.url?.startsWith("/maps/public") && req.method === "GET") {
    const query = new URL(req.url, "http://localhost").searchParams;
    listPublicMaps(query.get("q") ?? "", Number(query.get("page")) || 0)
      .then((result) => {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify(result));
      })
      .catch((error: unknown) => {
        console.error("Galerie illisible :", error);
        res.writeHead(500);
        res.end();
      });
    return;
  }

  const publication = req.url?.match(/^\/me\/maps\/([0-9a-f-]{36})\/publication$/);
  if (publication && req.method === "POST") {
    withAccount(req, res, async (accountId) => {
      const payload = (await readJsonBody(req).catch(() => null)) as { published?: unknown } | null;
      if (typeof payload?.published !== "boolean") {
        res.writeHead(400);
        res.end();
        return;
      }
      const result = await setMapPublished(accountId, publication[1]!, payload.published);
      if (!result.ok && result.reason === "not-found") {
        res.writeHead(404);
        res.end();
        return;
      }
      // Refus d'équilibre : 422 avec la liste des raisons, à montrer au joueur.
      res.writeHead(result.ok ? 200 : 422, { "content-type": "application/json" });
      res.end(JSON.stringify(result.ok ? result.map : { problems: result.problems }));
    });
    return;
  }

  const copy = req.url?.match(/^\/me\/maps\/copies\/([0-9a-f-]{36})$/);
  if (copy && req.method === "POST") {
    withAccount(req, res, async (accountId) => {
      const copied = await copyPublicMap(accountId, copy[1]!);
      res.writeHead(copied ? 200 : 404, { "content-type": "application/json" });
      res.end(copied ? JSON.stringify(copied) : undefined);
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

  // Amis : tout demande un compte (voir friends.ts).
  const url = new URL(req.url ?? "/", "http://localhost");
  if (url.pathname === "/me/players" && req.method === "GET") {
    withAccount(req, res, async (accountId) => {
      sendJson(res, 200, {
        players: await findByCode(accountId, url.searchParams.get("code") ?? ""),
      });
    });
    return;
  }
  if (url.pathname === "/me/friends" && req.method === "GET") {
    withAccount(req, res, async (accountId) => sendJson(res, 200, await listFriends(accountId)));
    return;
  }
  // Le code joueur voyage dans le corps de la requête, jamais dans l'adresse.
  const friendAction = FRIEND_ACTIONS[url.pathname];
  if (friendAction && req.method === "POST") {
    withAccount(req, res, async (accountId) => {
      const payload = (await readJsonBody(req).catch(() => null)) as { tag?: unknown } | null;
      if (typeof payload?.tag !== "string") return sendJson(res, 400, {});
      sendJson(res, 200, { outcome: await friendAction(accountId, payload.tag) });
    });
    return;
  }

  // Invitations en attente dans un salon (voir lobby.ts), que le front interroge.
  if (url.pathname === "/me/invites" && req.method === "GET") {
    withAccount(req, res, async (accountId) =>
      sendJson(res, 200, { invites: lobbies.invitesFor(accountId) }),
    );
    return;
  }
  if (url.pathname === "/me/invites/decline" && req.method === "POST") {
    withAccount(req, res, async (accountId) => {
      const payload = (await readJsonBody(req).catch(() => null)) as { code?: unknown } | null;
      if (typeof payload?.code !== "string") return sendJson(res, 400, {});
      lobbies.decline(accountId, payload.code);
      sendJson(res, 200, {});
    });
    return;
  }

  // Garde-robe (voir wardrobe.ts) : ce qu'on possède, ce qu'on porte, les cadeaux.
  if (url.pathname === "/me/wardrobe" && req.method === "GET") {
    withAccount(req, res, async (accountId) => {
      sendJson(res, 200, { ...(await getWardrobe(accountId)), total: CATALOG.length });
    });
    return;
  }
  // Porter et enregistrer sont deux gestes distincts.
  if (url.pathname === "/me/outfit" && req.method === "POST") {
    withAccount(req, res, async (accountId) => {
      const payload = (await readJsonBody(req).catch(() => null)) as { outfit?: unknown } | null;
      sendJson(res, (await wearOutfit(accountId, payload?.outfit)) ? 200 : 400, {});
    });
    return;
  }
  if (url.pathname === "/me/presets" && req.method === "POST") {
    withAccount(req, res, async (accountId) => {
      const payload = (await readJsonBody(req).catch(() => null)) as {
        preset?: unknown;
        outfit?: unknown;
      } | null;
      const saved = await savePreset(accountId, payload?.preset, payload?.outfit);
      sendJson(res, saved ? 200 : 400, {});
    });
    return;
  }
  // La fin du tutoriel n'est pas vérifiable ici (il se joue dans le navigateur) : le risque se limite
  // à ce cadeau, donné une seule fois par compte.
  if (url.pathname === "/me/gifts/tutorial" && req.method === "POST") {
    withAccount(req, res, async (accountId) => {
      sendJson(res, 200, { item: (await giveRandomItem(accountId, "tutorial")) ?? null });
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

  // L'identifiant client est public. Le front le demande ici plutôt que de le
  // figer au build : la même image sert ainsi tous les environnements.
  if (req.url === "/auth/config" && req.method === "GET") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ googleClientId: GOOGLE_CLIENT_ID ?? null }));
    return;
  }

  if (req.url === "/auth/google" && req.method === "POST") {
    readJsonBody(req).then(
      async (payload) => {
        const { credential, anonId } = payload as { credential?: unknown; anonId?: unknown };
        if (!GOOGLE_CLIENT_ID || typeof credential !== "string") {
          res.writeHead(400);
          res.end();
          return;
        }

        try {
          const profile = await verifyGoogleCredential(credential, GOOGLE_CLIENT_ID);
          if (!profile) {
            res.writeHead(401, { "content-type": "application/json" });
            res.end(JSON.stringify({ error: "Connexion Google refusée." }));
            return;
          }
          const result = await loginWithGoogle(
            profile,
            typeof anonId === "string" ? anonId : undefined,
          );
          res.writeHead(200, { "content-type": "application/json" });
          res.end(JSON.stringify(result));
        } catch (error) {
          console.error("Échec de la connexion Google :", error);
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
          if (error instanceof EmailAlreadyUsedError) {
            res.writeHead(409, { "content-type": "application/json" });
            const message = "Cette adresse email a déjà un compte.";
            res.end(JSON.stringify({ error: message }));
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
        const { email, password } = payload as { email?: unknown; password?: unknown };
        if (typeof email !== "string" || typeof password !== "string") {
          res.writeHead(400);
          res.end();
          return;
        }

        try {
          const result = await loginAccount(email, password);
          if (!result) {
            res.writeHead(401, { "content-type": "application/json" });
            res.end(JSON.stringify({ error: "Email ou mot de passe incorrect." }));
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
        const { username, tag, email } = account;
        res.end(JSON.stringify({ username, tag, email, stats }));
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

  res.writeHead(404);
  res.end();
});

// Un site tiers ne doit pas pouvoir ouvrir de WebSocket vers le serveur avec le navigateur d'un joueur.
const wss = new WebSocketServer({
  server: httpServer,
  verifyClient: ({ origin }: { origin?: string }) => isOriginAllowed(origin, allowedOrigins),
});
const rooms = new Map<string, GameRoom>();
const matchmaker = new Matchmaker();

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
function recordMatchResult(result: MatchResult): Promise<void> {
  const recorded = recordMatch(result).catch((error: unknown) => {
    console.error("Échec de l'enregistrement de la partie :", error);
  });
  // Le classement suit la même règle : jamais bloquant, jamais fatal.
  applyMatchRatings(result).catch((error: unknown) => {
    console.error("Échec de la mise à jour du classement :", error);
  });
  return recorded;
}

/**
 * Complète les places restées vides au moment du départ (voir
 * matchmaking.ts) : ce qui n'a pas trouvé d'humain en dix secondes se joue
 * contre un bot. Appelé une seule fois par salle, juste avant son départ —
 * d'où le comptage des places à cet instant et non à la création.
 *
 * `rating` est celui du joueur qui a OUVERT la salle : c'est lui qui a attendu,
 * et le niveau des adversaires artificiels doit rester celui qu'on lui avait
 * promis même si d'autres l'ont rejoint entre-temps.
 */
async function fillWithBots(room: GameRoom, rating: number, botLevel: BotLevel): Promise<void> {
  const seats = room.freeSeats;
  if (seats <= 0) return;

  // Adversaires artificiels choisis dans la population de bots (voir
  // botAccounts.ts) : ce sont de vrais comptes, avec pseudo et classement.
  // Rien dans l'interface ne les distingue d'un humain.
  const opponents = await pickBotOpponents(rating, seats).catch(() => []);
  for (let i = 0; i < seats; i++) {
    const bot = opponents[i];
    if (bot) {
      // Le niveau de jeu vient du COMPTE du bot, pas de son classement (voir
      // botAccounts.ts#levelOf) : son classement bouge avec ses résultats, son
      // intelligence non.
      room.addBot(randomUUID(), bot.username, bot.level, bot.anonId, bot.outfit);
    } else {
      // Base injoignable : on complète quand même la partie plutôt que de
      // laisser le joueur seul sur le plateau.
      room.addBot(randomUUID(), `${BOT_LEVELS[botLevel].label} ${i + 1}`, botLevel);
    }
  }
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

/**
 * Qui joue : le compte derrière le token s'il est valide, sinon un invité.
 * Les parties d'un compte sont enregistrées sous SON identifiant, pas sous
 * celui qu'envoie le navigateur.
 */
async function resolvePlayer(
  guestAnonId: string,
  token?: string,
): Promise<{ signedIn: boolean; anonId: string; outfit: string[]; accountId?: string }> {
  const accountId = token ? await getAccountIdForToken(token) : undefined;
  if (!accountId) return { signedIn: false, anonId: guestAnonId, outfit: [] };
  return {
    signedIn: true,
    accountId,
    anonId: await anonIdForAccount(accountId),
    outfit: await getOutfit(accountId),
  };
}

/** La connexion de chaque joueur de salon apprend ainsi dans quelle salle il joue. */
const roomEntries = new Map<string, { socket: WebSocket; enter: (room: GameRoom) => void }>();

/** Lance la partie d'un salon : une salle sans enregistrement ni classement. */
const lobbies = new LobbyRegistry(({ mode, players, bots, botLevel, onEnd }) => {
  const official = pickRandomOfficialMap(playerCountFor(mode));
  if (!official) return undefined;
  const id = `lobby-${randomUUID()}`;
  const room = new GameRoom(
    id,
    official.map,
    official.spawns,
    WIN_SCORE,
    {
      mapName: official.name,
      mode,
      // Rien n'est enregistré. Différé d'un tour : le message de fin de partie
      // doit arriver avant la réouverture du salon.
      onEnd: () =>
        queueMicrotask(() => {
          rooms.delete(id);
          onEnd();
        }),
    },
    official.spawns.length,
  );
  rooms.set(id, room);
  // Tant que tout le monde n'est pas assis, personne ne joue et le décompte n'a pas commencé.
  room.openForWaiting(Date.now());
  for (const player of players) {
    const entry = roomEntries.get(player.playerId);
    if (!entry) continue;
    entry.enter(room);
    // La carte d'abord : le client la pose avant le premier état.
    player.send({ ...room.getMapMessage(), you: player.playerId });
    room.join(player.playerId, player.username, entry.socket, undefined, player.outfit);
  }
  for (let i = 1; i <= bots; i++) {
    room.addBot(randomUUID(), `${BOT_LEVELS[botLevel].label} ${i}`, botLevel);
  }
  room.start(COUNTDOWN_MS);
  return {
    leave: (playerId) => {
      room.leave(playerId);
      if (room.humanCount === 0) rooms.delete(id);
    },
  };
});

wss.on("connection", (socket: WebSocket) => {
  const playerId = randomUUID();
  const send = (message: ServerMessage) => socket.send(JSON.stringify(message));
  roomEntries.set(playerId, { socket, enter: (room) => (currentRoom = room) });

  /** Crée ou rejoint un salon : réservé aux comptes. */
  async function enterLobby(
    message: Extract<ClientMessage, { type: "LOBBY_CREATE" | "LOBBY_JOIN" }>,
  ): Promise<void> {
    const accountId = await getAccountIdForToken(message.token);
    const account = accountId ? await getAccountById(accountId) : undefined;
    if (!accountId || !account) return send({ type: "LOBBY_CLOSED", reason: ACCOUNT_REQUIRED });
    const outfit = await getOutfit(accountId);
    // La connexion a pu se fermer pendant les lectures : pas de joueur fantôme.
    if (socket.readyState !== socket.OPEN) return;
    const player = {
      playerId,
      accountId,
      username: account.username,
      tag: account.tag,
      outfit,
      send,
    };
    lobbyAccount = accountId;
    if (message.type === "LOBBY_CREATE") {
      lobbies.create(player, message.mode);
      return;
    }
    const refusal = lobbies.join(player, message.code);
    if (refusal) send({ type: "LOBBY_CLOSED", reason: refusal });
  }
  let lobbyAccount: string | undefined;
  let currentRoom: GameRoom | null = null;
  let currentRoomId: string | null = null;
  // Mode de la salle rejointe : c'est la clé sous laquelle le matchmaker la
  // range (voir matchmaking.ts), donc ce qu'il faut pour l'en retirer au
  // départ du joueur.
  let currentMode: GameMode | null = null;

  function dispatch(message: ClientMessage): void {
    if (message.type === "JOIN") {
      // Salle partagée : on rejoint celle qui attend des joueurs dans ce mode
      // s'il y reste une place, et on n'en ouvre une neuve que sinon (voir
      // matchmaking.ts). C'est ce qui fait se rencontrer deux joueurs qui
      // cliquent en même temps — avant, chaque JOIN créait sa propre salle
      // privée et tout le monde jouait seul contre des bots.
      resolvePlayer(message.anonId, message.token)
        .then(async ({ signedIn, anonId, outfit, accountId }) => {
          const mode = isGameMode(message.mode) ? message.mode : DEFAULT_GAME_MODE;
          if (!isAllowed(mode, signedIn)) {
            const error: ServerMessage = { type: "ERROR", message: ACCOUNT_REQUIRED };
            socket.send(JSON.stringify(error));
            return;
          }

          const open = matchmaker.find(mode);
          if (open) {
            currentRoom = open;
            currentRoomId = open.id;
            currentMode = mode;
            open.join(playerId, message.name, socket, anonId, outfit, accountId);
            socket.send(JSON.stringify({ ...open.getMapMessage(), you: playerId }));
            // Cette arrivée a peut-être complété la salle : elle part alors
            // sans attendre la fin du délai.
            matchmaker.settle(mode);
            return;
          }

          // Niveau des bots : demandé par le client (réglage/essai), sinon
          // celui par défaut. Le nom du bot le porte pour qu'on voie tout de
          // suite à qui on a affaire dans le score.
          const botLevel = isBotLevel(message.botLevel) ? message.botLevel : DEFAULT_BOT_LEVEL;
          // Le classement du joueur guide le choix des adversaires. Inconnu
          // (pas de compte) -> valeur de départ, donc des bots de niveau moyen.
          const playerRating = await getRatingForAnonId(anonId).catch(() => STARTING_RATING);
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
          currentMode = mode;
          // La récompense attend que la partie soit enregistrée : elle compte dans les parties du jour.
          let recorded: Promise<void> = Promise.resolve();
          const matchContext: MatchContext = {
            mapName: official.name,
            mode,
            onEnd: (result) => {
              recorded = recordMatchResult(result);
            },
            reward: async ({ accountId: winnerAccount, moves }) => {
              await recorded;
              const award = await awardChest(winnerAccount, moves);
              if (award.outcome === "won") {
                return { type: "CHEST", outcome: "won", rarity: award.chest.rarity };
              }
              return award.outcome === "none"
                ? undefined
                : { type: "CHEST", outcome: award.outcome };
            },
          };
          const room = new GameRoom(
            currentRoomId,
            official.map,
            official.spawns,
            WIN_SCORE,
            matchContext,
            // La carte a autant de bases que le mode a de joueurs : c'est elle
            // qui fixe le nombre de places, donc quand la salle est pleine.
            official.spawns.length,
          );
          currentRoom = room;
          rooms.set(currentRoomId, room);

          // Mise en attente AVANT l'entrée du joueur : sans ça, le premier
          // arrivant reçoit un WAITING sans échéance, puis plus rien jusqu'au
          // départ — un compte à rebours qui commence à un chiffre inconnu.
          matchmaker.hold(mode, room, () => fillWithBots(room, playerRating, botLevel));
          room.join(playerId, message.name, socket, anonId, outfit, accountId);
          socket.send(JSON.stringify({ ...room.getMapMessage(), you: playerId }));
          // Un mode à une seule place partirait immédiatement : il n'y a
          // personne à attendre. Aucun mode n'est dans ce cas aujourd'hui
          // (voir shared.ts#GAME_MODES), mais la salle ne doit pas dépendre de
          // cette coïncidence pour partir.
          matchmaker.settle(mode);
        })
        .catch((error: unknown) => {
          console.error("Échec du JOIN :", error);
        });
      return;
    }

    // Tester une carte, c'est le créatif : réservé aux comptes.
    if (message.type === "JOIN_TEST") {
      resolvePlayer("", message.token)
        .then(({ signedIn }) => {
          if (signedIn) return startTest(message);
          const error: ServerMessage = { type: "ERROR", message: ACCOUNT_REQUIRED };
          socket.send(JSON.stringify(error));
        })
        .catch((error: unknown) => {
          console.error("Échec du JOIN_TEST :", error);
        });
      return;
    }

    if (message.type === "LOBBY_CREATE" || message.type === "LOBBY_JOIN") {
      enterLobby(message).catch((error: unknown) => {
        console.error("Échec de l'entrée au salon :", error);
      });
      return;
    }
    if (message.type === "LOBBY_SETTINGS") return lobbies.configure(playerId, message);
    if (message.type === "LOBBY_START") return lobbies.start(playerId);
    if (message.type === "LOBBY_INVITE") {
      if (!lobbyAccount) return;
      friendByCode(lobbyAccount, message.tag)
        .then((friend) => friend && lobbies.invite(playerId, friend))
        .catch((error: unknown) => {
          console.error("Échec de l'invitation :", error);
        });
      return;
    }

    currentRoom?.handle(playerId, message);
  }

  function startTest(message: JoinTestMessage): void {
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
    currentRoom.startCountdown(COUNTDOWN_MS);
    // Pas de mise en attente : l'entraînement se joue seul contre des bots,
    // sur sa propre carte, et n'est jamais partagé. Il n'a personne à
    // attendre, donc il joue dès maintenant (voir room.ts#openForWaiting).
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
    roomEntries.delete(playerId);
    lobbies.leave(playerId);
    if (!currentRoom) return;
    currentRoom.leave(playerId);

    // Salle encore en attente et vidée de ses humains : on désarme son départ,
    // sinon des bots entameraient une partie que plus personne ne regarde.
    if (currentMode) matchmaker.release(currentMode, currentRoom);

    // Une salle est PARTAGÉE depuis le matchmaking : elle ne disparaît que
    // lorsque son dernier humain s'en va. L'oublier au départ du premier
    // couperait la partie de ceux qui restent.
    if (currentRoom.humanCount === 0 && currentRoomId) rooms.delete(currentRoomId);
  });
});

// Le schéma est appliqué AVANT d'accepter des joueurs : une mise à jour apporte ses migrations avec elle.
const appliedSchema = await applySchemaWhenReady(DATABASE_URL);
console.log(`Schéma de base appliqué (${appliedSchema.length} fichiers)`);

httpServer.listen(PORT, () => {
  console.log(`Duck server listening on :${PORT}`);

  // Peuple la table de bots si elle ne l'est pas encore (idempotent). Sans
  // eux, un joueur seul n'a personne en face — et l'application a l'air vide.
  ensureBotPopulation()
    .then(async (created) => {
      if (created > 0) console.log(`${created} bots créés`);
      const dressed = await dressBots();
      if (dressed > 0) console.log(`${dressed} bots habillés`);
    })
    .catch((error: unknown) => {
      console.error("Peuplement des bots impossible :", error);
    });
});

// Arrêt propre : Watchtower arrête le conteneur à chaque mise à jour. On prévient les joueurs connectés (code 1001,
// « le serveur s'en va »), on ferme les connexions et la base, puis on sort avec le code 0. Délai maximal : 10 s.
function shutdown(signal: string): void {
  console.log(`${signal} reçu : arrêt du serveur`);
  setTimeout(() => process.exit(1), 10_000).unref();
  for (const client of wss.clients) client.close(1001, "server_shutdown");
  wss.close();
  httpServer.close(() => {
    closeDb().then(
      () => process.exit(0),
      () => process.exit(1),
    );
  });
  httpServer.closeAllConnections();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

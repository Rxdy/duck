import { isBotLevel } from "./bots.js";
import type { ClientMessage, Direction, JoinMessage, JoinTestMessage } from "./protocol.js";
import { isGameMode } from "./shared.js";

/** Même principe que TILE_VALUES dans mapWire.ts : la liste fait foi à l'exécution. */
const DIRECTION_VALUES = new Set<string>(["UP", "DOWN", "LEFT", "RIGHT"]);

export function isDirection(value: unknown): value is Direction {
  return typeof value === "string" && DIRECTION_VALUES.has(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/**
 * Seuls `gameId`, `name` et `anonId` sont exigés : ce sont les trois valeurs
 * qu'index.ts utilise sans repli possible (identité du joueur, rattachement de
 * la partie à un compte). Les champs facultatifs, eux, ne font jamais échouer
 * le JOIN — une valeur aberrante disparaît simplement, et le serveur retombe
 * sur ses réglages par défaut exactement comme face à un client plus ancien
 * qui ne les envoie pas du tout.
 */
function parseJoin(value: Record<string, unknown>): JoinMessage | null {
  const { gameId, name, anonId } = value;
  if (typeof gameId !== "string" || typeof name !== "string" || typeof anonId !== "string") {
    return null;
  }

  const join: JoinMessage = { type: "JOIN", gameId, name, anonId };
  if (typeof value.token === "string") join.token = value.token;
  if (isGameMode(value.mode)) join.mode = value.mode;
  if (isBotLevel(value.botLevel)) join.botLevel = value.botLevel;
  return join;
}

/**
 * Vérifie seulement la FORME du plateau custom (des nombres, deux tableaux) :
 * le contenu est déjà passé au tamis case par case par buildMapFromWire et
 * parseWireSpawns (voir mapWire.ts), inutile de refaire leur travail ici. Ce
 * qu'ils ne savent pas absorber, en revanche, c'est un `map` absent ou un
 * `tiles` qui n'est pas un tableau — d'où ce filtre en amont.
 */
function parseJoinTest(value: Record<string, unknown>): JoinTestMessage | null {
  const { map } = value;
  if (!isRecord(map)) return null;

  const width = asFiniteNumber(map.width);
  const height = asFiniteNumber(map.height);
  if (width === undefined || height === undefined) return null;
  if (!Array.isArray(map.tiles) || !Array.isArray(map.spawns)) return null;

  return { type: "JOIN_TEST", map: { width, height, tiles: map.tiles, spawns: map.spawns } };
}

/**
 * Porte d'entrée unique des messages WebSocket. Tout ce qui arrive du réseau
 * est inconnu jusqu'à preuve du contraire : `JSON.parse(raw) as ClientMessage`
 * est une promesse que TypeScript ne tient qu'à la compilation, et personne ne
 * la tenait à l'exécution. Un `{"type":"MOVE","direction":"NE"}` traversait
 * donc tout le serveur jusqu'à `DIRECTION_DELTA[direction]`, rendait
 * `undefined`, et faisait tomber le process — avec lui TOUTES les parties en
 * cours, celles des autres joueurs comprises. Un joueur ne doit jamais pouvoir
 * couper la partie d'un autre, même en s'y employant.
 *
 * Rend `null` pour tout message non reconnu. L'appelant l'ignore en silence
 * plutôt que de fermer la connexion : le seul émetteur légitime est notre
 * propre client, un refus signale donc soit un bug chez nous, soit quelqu'un
 * qui sonde le serveur — ni l'un ni l'autre ne justifie d'éjecter en pleine
 * partie un joueur dont le coup suivant sera peut-être valide.
 */
export function parseClientMessage(raw: string): ClientMessage | null {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(value)) return null;

  switch (value.type) {
    case "PING":
      return { type: "PING" };
    case "MOVE":
      return isDirection(value.direction) ? { type: "MOVE", direction: value.direction } : null;
    case "JOIN":
      return parseJoin(value);
    case "JOIN_TEST":
      return parseJoinTest(value);
    default:
      return null;
  }
}

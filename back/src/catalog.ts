/** La liste des accessoires, côté serveur. Sans base ni réseau : le moteur de jeu peut s'en servir. */
import { readFileSync } from "node:fs";
import type { BotLevel } from "./bots.js";

export interface CatalogItem {
  id: string;
  emplacement: string;
}

/** Les accessoires à gagner, exportés depuis le catalogue du jeu (`make accessories`). */
export const CATALOG: readonly CatalogItem[] = JSON.parse(
  readFileSync(new URL("./accessories.json", import.meta.url), "utf-8"),
) as CatalogItem[];

export const SLOT_OF: ReadonlyMap<string, string> = new Map(
  CATALOG.map((item) => [item.id, item.emplacement]),
);

const SLOTS = [...new Set(CATALOG.map((item) => item.emplacement))];

/** Une tenue qu'on peut montrer : des pièces du catalogue, une au plus par emplacement. */
export function publicOutfit(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const taken = new Set<string>();
  return value.filter((id): id is string => {
    const slot = typeof id === "string" ? SLOT_OF.get(id) : undefined;
    if (!slot || taken.has(slot)) return false;
    taken.add(slot);
    return true;
  });
}

/**
 * Les bots sont habillés comme des joueurs qui avancent : peu de pièces au début, une tenue presque
 * complète au sommet. [minimum, maximum] de pièces par niveau.
 */
const BOT_PIECES: Record<BotLevel, readonly [number, number]> = {
  debutant: [1, 2],
  intermediaire: [1, 3],
  confirme: [2, 4],
  expert: [3, 5],
  impossible: [4, 5],
};

export function randomBotOutfit(level: BotLevel, random: () => number = Math.random): string[] {
  const pick = (count: number) => Math.min(count - 1, Math.floor(random() * count));
  const [min, max] = BOT_PIECES[level];
  const wanted = min + pick(max - min + 1);
  const free = [...SLOTS];
  return Array.from({ length: Math.min(wanted, free.length) }, () => {
    const slot = free.splice(pick(free.length), 1)[0]!;
    const choices = CATALOG.filter((item) => item.emplacement === slot);
    return choices[pick(choices.length)]!.id;
  });
}

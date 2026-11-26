import { ACCESSOIRES, type Accessory, type Slot } from "./accessories/accessoires.js";

export const SLOTS: { value: Slot; label: string }[] = [
  { value: "tete", label: "Tête" },
  { value: "visage", label: "Visage" },
  { value: "corps", label: "Corps" },
  { value: "dos", label: "Dos" },
  { value: "main", label: "Main" },
];

const BY_ID = new Map(ACCESSOIRES.map((item) => [item.id, item]));

export const accessoryById = (id: string): Accessory | undefined => BY_ID.get(id);
export const accessoryName = (id: string) => BY_ID.get(id)?.nom ?? "Accessoire";

/** La tenue après avoir mis `id` à cet emplacement, ou l'avoir libéré (`undefined`). */
export function wear(outfit: readonly string[], slot: Slot, id: string | undefined): string[] {
  const others = outfit.filter((worn) => BY_ID.get(worn)?.emplacement !== slot);
  return id ? [...others, id] : others;
}

/** Tout, seulement ce qu'on a débloqué, ou seulement ce qui reste à gagner. */
export type Show = "all" | "owned" | "locked";

/** Tout ce qui se gagne : ce qu'on possède d'abord, puis le reste, dans l'ordre du catalogue. */
export function collection(owned: readonly string[], slot: Slot | "all", show: Show = "all") {
  const has = new Set(owned);
  return ACCESSOIRES.filter((a) => !a.reserve && (slot === "all" || a.emplacement === slot))
    .map((a) => ({ id: a.id, nom: a.nom, emplacement: a.emplacement, owned: has.has(a.id) }))
    .filter((a) => show === "all" || a.owned === (show === "owned"))
    .sort((a, b) => Number(b.owned) - Number(a.owned));
}

/**
 * Une tenue au hasard parmi ce qu'on possède : une pièce à chaque emplacement où l'on en a. Elle
 * diffère de `current` quand c'est possible, pour que chaque appui se voie.
 */
export function randomOutfit(
  owned: readonly string[],
  current: readonly string[] = [],
  random: () => number = Math.random,
): string[] {
  return SLOTS.flatMap(({ value }) => {
    const choices = collection(owned, value).filter((item) => item.owned);
    const others = choices.filter((item) => !current.includes(item.id));
    const pool = others.length ? others : choices;
    return pool.length ? [pool[Math.floor(random() * pool.length)]!.id] : [];
  });
}

export const sameOutfit = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((id) => b.includes(id));

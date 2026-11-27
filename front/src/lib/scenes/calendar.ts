import type { Device, Edition, Layout, PageKind } from "./types.js";
import { NOEL_2026 } from "./noel-2026.js";

/**
 * Le calendrier de l'année : chaque événement a sa fenêtre, et chaque année ses éditions (noel-2026,
 * noel-2027...). Un événement sans édition produite n'habille rien : le décor classique reste.
 */
export interface EventWindow {
  id: string;
  name: string;
  /** [mois, jour] de début et de fin, bornes comprises ; une fenêtre qui chevauche le 1er janvier est permise. */
  from: readonly [number, number];
  to: readonly [number, number];
}

export const EVENTS: readonly EventWindow[] = [
  { id: "noel", name: "Noël", from: [11, 20], to: [1, 6] },
  { id: "saint-valentin", name: "Saint-Valentin", from: [2, 7], to: [2, 14] },
  { id: "halloween", name: "Halloween", from: [10, 18], to: [11, 2] },
  { id: "ete", name: "Été", from: [7, 1], to: [8, 31] },
];

/** Les éditions produites. Pour une nouvelle année : une nouvelle édition ici (voir docs/13-scenes-saison.md). */
export const EDITIONS: readonly Edition[] = [NOEL_2026];

/** Dimanche de Pâques (algorithme de Meeus/Jones/Butcher), pour la fenêtre mobile de Pâques. */
export function easter(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

const DAY = 86_400_000;
const key = (month: number, day: number) => month * 100 + day;

/** L'événement en cours et l'année de son édition (celle où il commence : le 3 janvier 2027 est encore noel-2026). */
export function activeEvent(date: Date): { event: string; year: number } | undefined {
  const year = date.getFullYear();
  const today = key(date.getMonth() + 1, date.getDate());
  for (const window of EVENTS) {
    const from = key(...window.from);
    const to = key(...window.to);
    if (from <= to) {
      if (today >= from && today <= to) return { event: window.id, year };
    } else if (today >= from) {
      return { event: window.id, year };
    } else if (today <= to) {
      return { event: window.id, year: year - 1 };
    }
  }
  const paques = easter(year).getTime();
  const now = new Date(year, date.getMonth(), date.getDate()).getTime();
  if (now >= paques - 14 * DAY && now <= paques + DAY) return { event: "paques", year };
  return undefined;
}

/**
 * L'édition à montrer : celle de l'année en cours, ou à défaut la plus récente d'avant (les images
 * de Noël 2026 servent en 2027 tant que celles de 2027 ne sont pas faites). `forced` (« noel » ou
 * « noel-2026 ») impose un événement, pour le voir hors saison.
 */
export function editionFor(
  date: Date,
  forced?: string | null,
  editions: readonly Edition[] = EDITIONS,
): Edition | undefined {
  let wanted = activeEvent(date);
  if (forced) {
    const exact = editions.find((edition) => edition.id === forced);
    if (exact) return exact;
    wanted = { event: forced, year: date.getFullYear() };
  }
  if (!wanted) return undefined;
  return editions
    .filter((edition) => edition.event === wanted!.event && edition.year <= wanted!.year)
    .sort((a, b) => b.year - a.year)[0];
}

/** La composition pour une page et un format d'écran ; à défaut, celle des pages ordinaires. */
export function layoutFor(edition: Edition, page: PageKind, device: Device): Layout | undefined {
  return (
    edition.layouts.find((l) => l.page === page && l.device === device) ??
    edition.layouts.find((l) => l.page === "defaut" && l.device === device)
  );
}

/** Où se trouve l'image d'une composition (front/public/scenes/). */
export const imagePath = (edition: Edition, layout: Layout) =>
  `/scenes/${edition.id}/${layout.page}-${layout.device}.jpg`;

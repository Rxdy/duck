import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const MAPS_DIR = join(process.cwd(), "maps");

export interface SavedMapPayload {
  id: string;
  name: string;
  category: "duel" | "equipe";
  width: number;
  height: number;
  tiles: unknown;
  updatedAt: string;
}

const DIACRITICS = /[\u0300-\u036f]/g;

/** Nom de fichier lisible : accents/espaces retirés, jamais vide. */
export function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(DIACRITICS, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");
  return slug || "carte";
}

/**
 * Écrit une carte de l'éditeur dans back/maps/ (créé au premier appel si
 * besoin) : point de dépôt pour qu'elles soient ensuite reprises comme cartes
 * par défaut du serveur (voir docs/02-gameplay.md), en plus de la sauvegarde
 * locale du navigateur (front/src/lib/savedMaps.ts, inchangée). Frontière
 * d'E/S — volontairement non testée unitairement, comme le reste des
 * fonctions de ce type dans le projet (voir lib/settings.ts côté front).
 */
export function saveMapFile(payload: SavedMapPayload): { file: string } {
  mkdirSync(MAPS_DIR, { recursive: true });
  const file = `${slugify(payload.name)}-${randomUUID().slice(0, 8)}.json`;
  writeFileSync(join(MAPS_DIR, file), JSON.stringify(payload, null, 2));
  return { file };
}

import type { Group } from "three";
import type { Coincoin } from "../coincoin.js";

export type Slot = "tete" | "visage" | "corps" | "dos" | "main";

export interface Accessory {
  id: string;
  nom: string;
  emplacement: Slot;
  /** Propre à Coincoin : ne se gagne pas. */
  reserve?: boolean;
  sansAntennes?: boolean;
}

export interface Outfit {
  id: string;
  nom: string;
  pieces: string[];
}

export const ACCESSOIRES: Accessory[];
export const TENUES: Outfit[];
export const THEMES: Outfit[];
export const THEMES_LOT1: Outfit[];
export const THEMES_LOT2: Outfit[];
export const THEMES_LOT3: Outfit[];
export const THEMES_LOT4: Outfit[];
export const THEMES_LOT5: Outfit[];

/** Pose les accessoires sur le canard et renvoie le groupe ajouté. */
export function habiller(duck: Coincoin, ids: readonly string[]): Group;

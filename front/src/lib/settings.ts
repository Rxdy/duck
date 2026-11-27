import type { Direction } from "../types.js";
import { SCENERY_MODES, type SceneryMode } from "./scenery.js";

export type KeyBindings = Record<Direction, string>;

/** Au doigt : des boutons sous le plateau, ou les quatre quarts de l'écran. */
export type TouchControlsSetting = "boutons" | "zones";

export interface Settings {
  musicVolume: number;
  sfxVolume: number;
  keyBindings: KeyBindings;
  hapticsEnabled: boolean;
  reducedMotion: boolean;
  colorblindMode: boolean;
  touchControls: TouchControlsSetting;
  /** Décor de la carte : tactique (sobre), paysage, ou selon l'appareil. */
  scenery: SceneryMode;
}

export const DEFAULT_KEY_BINDINGS: KeyBindings = {
  UP: "ArrowUp",
  DOWN: "ArrowDown",
  LEFT: "ArrowLeft",
  RIGHT: "ArrowRight",
};

export const DEFAULT_SETTINGS: Settings = {
  musicVolume: 60,
  sfxVolume: 80,
  keyBindings: { ...DEFAULT_KEY_BINDINGS },
  hapticsEnabled: true,
  reducedMotion: false,
  colorblindMode: false,
  // Des boutons par défaut : le doigt ne passe pas devant le plateau.
  touchControls: "boutons",
  // Tactique tant que le paysage n'est pas au point (herbe à refaire).
  scenery: "tactique",
};

function clampVolume(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(100, Math.max(0, Math.round(n)));
}

function parseKeyBindings(raw: unknown): KeyBindings {
  const bindings = { ...DEFAULT_KEY_BINDINGS };
  if (typeof raw !== "object" || raw === null) return bindings;

  const r = raw as Partial<Record<Direction, unknown>>;
  for (const direction of Object.keys(DEFAULT_KEY_BINDINGS) as Direction[]) {
    const bound = r[direction];
    if (typeof bound === "string" && bound) bindings[direction] = bound;
  }
  return bindings;
}

/**
 * Fusionne des données brutes (ex: JSON lu depuis localStorage, potentiellement
 * d'un ancien format ou corrompues) avec les valeurs par défaut : un champ
 * manquant ou invalide retombe sur sa valeur par défaut plutôt que de casser
 * le chargement de tous les réglages.
 */
export function parseSettings(raw: unknown): Settings {
  if (typeof raw !== "object" || raw === null) return { ...DEFAULT_SETTINGS };
  const r = raw as Partial<Record<keyof Settings, unknown>>;

  return {
    musicVolume: clampVolume(r.musicVolume, DEFAULT_SETTINGS.musicVolume),
    sfxVolume: clampVolume(r.sfxVolume, DEFAULT_SETTINGS.sfxVolume),
    keyBindings: parseKeyBindings(r.keyBindings),
    hapticsEnabled:
      typeof r.hapticsEnabled === "boolean" ? r.hapticsEnabled : DEFAULT_SETTINGS.hapticsEnabled,
    reducedMotion:
      typeof r.reducedMotion === "boolean" ? r.reducedMotion : DEFAULT_SETTINGS.reducedMotion,
    colorblindMode:
      typeof r.colorblindMode === "boolean" ? r.colorblindMode : DEFAULT_SETTINGS.colorblindMode,
    touchControls:
      r.touchControls === "boutons" || r.touchControls === "zones"
        ? r.touchControls
        : DEFAULT_SETTINGS.touchControls,
    scenery: SCENERY_MODES.includes(r.scenery as SceneryMode)
      ? (r.scenery as SceneryMode)
      : DEFAULT_SETTINGS.scenery,
  };
}

const STORAGE_KEY = "duck:settings";

/** Frontière d'E/S (localStorage) — volontairement non testée unitairement. */
export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return parseSettings(raw ? JSON.parse(raw) : null);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function persistSettings(settings: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Stockage plein ou indisponible : on ignore, ce n'est pas critique.
  }
}

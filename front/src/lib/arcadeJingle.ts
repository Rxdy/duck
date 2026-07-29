export interface JingleNote {
  frequency: number;
  durationMs: number;
}

/**
 * Petit motif façon jingle d'arcade (montée rapide de 4 notes, esprit
 * "power-up"/coup d'envoi), pensé pour être joué en onde carrée "8-bit" (voir
 * lib/audio.ts). Gamme pentatonique : reste agréable même joué vite et fort.
 */
export const ARCADE_START_JINGLE: JingleNote[] = [
  { frequency: 523.25, durationMs: 90 }, // Do5
  { frequency: 659.25, durationMs: 90 }, // Mi5
  { frequency: 783.99, durationMs: 90 }, // Sol5
  { frequency: 1046.5, durationMs: 180 }, // Do6
];

/**
 * Boucle jouée en fond pendant la partie (voir lib/audio.ts#startAmbientLoop).
 * Volontairement discrète (voir le gain dans lib/audio.ts) mais assez longue
 * (16 notes, ~3s) pour ne pas sonner comme un bip qui se répète toutes les
 * secondes — un motif trop court devient vite agaçant en fond continu.
 */
export const AMBIENT_LOOP_PATTERN: JingleNote[] = [
  { frequency: 261.63, durationMs: 200 }, // Do4
  { frequency: 329.63, durationMs: 200 }, // Mi4
  { frequency: 392.0, durationMs: 200 }, // Sol4
  { frequency: 329.63, durationMs: 200 }, // Mi4
  { frequency: 293.66, durationMs: 200 }, // Re4
  { frequency: 329.63, durationMs: 200 }, // Mi4
  { frequency: 392.0, durationMs: 200 }, // Sol4
  { frequency: 440.0, durationMs: 200 }, // La4
  { frequency: 392.0, durationMs: 200 }, // Sol4
  { frequency: 329.63, durationMs: 200 }, // Mi4
  { frequency: 293.66, durationMs: 200 }, // Re4
  { frequency: 261.63, durationMs: 200 }, // Do4
  { frequency: 293.66, durationMs: 200 }, // Re4
  { frequency: 329.63, durationMs: 200 }, // Mi4
  { frequency: 293.66, durationMs: 200 }, // Re4
  { frequency: 261.63, durationMs: 400 }, // Do4 (résolution, avant que la boucle reparte)
];

/** Petit "bip" joué quand un joueur marque un point (voir lib/audio.ts#playScoreSfx). */
export const SCORE_SFX_PATTERN: JingleNote[] = [
  { frequency: 880, durationMs: 70 }, // La5
  { frequency: 1318.51, durationMs: 130 }, // Mi6
];

import {
  AMBIENT_LOOP_PATTERN,
  ARCADE_START_JINGLE,
  SCORE_SFX_PATTERN,
  type JingleNote,
} from "./arcadeJingle.js";

let sharedContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    sharedContext ??= new Ctor();
    return sharedContext;
  } catch {
    return null;
  }
}

/** Joue une séquence de notes en onde carrée "8-bit", à un volume donné (0-1). */
function playPattern(ctx: AudioContext, pattern: JingleNote[], gainValue: number): void {
  const gain = ctx.createGain();
  gain.gain.value = gainValue;
  gain.connect(ctx.destination);

  let startTime = ctx.currentTime;
  for (const note of pattern) {
    const oscillator = ctx.createOscillator();
    oscillator.type = "square";
    oscillator.frequency.value = note.frequency;
    oscillator.connect(gain);
    oscillator.start(startTime);
    oscillator.stop(startTime + note.durationMs / 1000);
    startTime += note.durationMs / 1000;
  }
}

/**
 * Frontière d'E/S (Web Audio) — volontairement non testée unitairement,
 * comme lib/settings.ts#loadSettings. Joue le jingle d'arcade au démarrage
 * d'une partie (voir composables/useGameSocket.ts et useTestGameSocket.ts).
 * `musicVolume` est le réglage 0-100 des Options : 0 = aucun son joué (pas
 * d'AudioContext créé pour rien).
 */
export function playArcadeStartJingle(musicVolume: number): void {
  if (musicVolume <= 0) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  // Volontairement discret même à 100% : c'est un jingle de démarrage, pas
  // une piste de fond qui doit couvrir les effets sonores.
  playPattern(ctx, ARCADE_START_JINGLE, (musicVolume / 100) * 0.2);
}

/** Petit bip joué quand un joueur marque un point. Suit le réglage "Effets sonores". */
export function playScoreSfx(sfxVolume: number): void {
  if (sfxVolume <= 0) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  playPattern(ctx, SCORE_SFX_PATTERN, (sfxVolume / 100) * 0.25);
}

let ambientTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Démarre la boucle de musique d'ambiance jouée pendant une partie (arrêtée
 * via stopAmbientLoop au démontage de la page de jeu). Se replanifie elle-même
 * note après note plutôt que d'utiliser setInterval : ça laisse la durée de
 * chaque note piloter le tempo sans dérive cumulée.
 */
export function startAmbientLoop(musicVolume: number): void {
  stopAmbientLoop();
  if (musicVolume <= 0) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const gain = ctx.createGain();
  // Très en retrait : c'est un fond sonore, pas une piste qu'on écoute.
  gain.gain.value = (musicVolume / 100) * 0.08;
  gain.connect(ctx.destination);

  const playStep = (index: number) => {
    const note = AMBIENT_LOOP_PATTERN[index % AMBIENT_LOOP_PATTERN.length]!;
    const oscillator = ctx.createOscillator();
    oscillator.type = "square";
    oscillator.frequency.value = note.frequency;
    oscillator.connect(gain);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + note.durationMs / 1000);
    ambientTimer = setTimeout(() => playStep(index + 1), note.durationMs);
  };
  playStep(0);
}

export function stopAmbientLoop(): void {
  if (ambientTimer) {
    clearTimeout(ambientTimer);
    ambientTimer = null;
  }
}

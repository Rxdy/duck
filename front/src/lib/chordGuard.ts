/**
 * Pas de diagonale : deux directions enfoncées ensemble (deux touches, ou deux doigts) donnaient deux
 * pas dans le temps d'un seul. Tant qu'une direction est maintenue, une autre est ignorée pendant
 * CHORD_MS. Passé ce délai, ou dès qu'on relâche, on enchaîne librement : taper vite reste permis.
 */
export const CHORD_MS = 100;

export function createChordGuard() {
  const held = new Map<string | number, number>();
  return {
    /** `true` si l'appui `id` (touche ou doigt) peut faire un pas. */
    press(id: string | number, now: number): boolean {
      const chord = [...held].some(([other, since]) => other !== id && now - since < CHORD_MS);
      if (!chord) held.set(id, now);
      return !chord;
    },
    release(id: string | number) {
      held.delete(id);
    },
    /** Quand on ne verra pas les relâchements (fenêtre quittée). */
    reset() {
      held.clear();
    },
  };
}

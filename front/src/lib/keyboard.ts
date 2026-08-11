import type { Direction } from "../types.js";
import type { KeyBindings } from "./settings.js";

/**
 * Retrouve la direction associée à une touche physique (KeyboardEvent.code,
 * ex: "ArrowUp"/"KeyW") d'après les bindings actuels. On utilise `.code`
 * plutôt que `.key` : il identifie la touche physique indépendamment de la
 * disposition clavier (AZERTY/QWERTY) et de l'état Maj/Alt.
 */
export function directionForKey(code: string, bindings: KeyBindings): Direction | undefined {
  const entry = (Object.entries(bindings) as [Direction, string][]).find(
    ([, boundCode]) => boundCode === code,
  );
  return entry?.[0];
}

const SPECIAL_LABELS: Record<string, string> = {
  ArrowUp: "↑",
  ArrowDown: "↓",
  ArrowLeft: "←",
  ArrowRight: "→",
  Space: "Espace",
};

/** Libellé court affiché pour une touche dans l'UI des réglages. */
export function labelForKeyCode(code: string): string {
  if (code in SPECIAL_LABELS) return SPECIAL_LABELS[code]!;
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  return code;
}

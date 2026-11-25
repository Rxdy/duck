/** Vrai sur un écran qu'on touche au doigt. */
export function isTouchScreen(): boolean {
  return window.matchMedia?.("(pointer: coarse)").matches ?? false;
}

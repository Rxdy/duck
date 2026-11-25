/** Pourcentage de victoires, arrondi. 0 si aucune partie jouée (pas de division par zéro). */
export function winRatioPercent(played: number, won: number): number {
  if (played === 0) return 0;
  return Math.round((won / played) * 100);
}

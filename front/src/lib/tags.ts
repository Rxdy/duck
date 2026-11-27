/** Ce que le plateau sait d'un canard d'une mise à jour à l'autre. */
export interface Placed {
  id: string;
  x: number;
  y: number;
  color: string;
}

export interface Tag {
  attackerId: string;
  victimId: string;
  /** Case du contact : celle que la victime occupait. */
  x: number;
  y: number;
  color: string;
}

const steps = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

/**
 * Retrouve les touchers dans deux états successifs : le serveur ne les annonce pas, il renvoie
 * simplement la victime chez elle pendant que l'attaquant entre sur sa case. Une victime a donc
 * sauté plus loin qu'une case, et un autre canard vient d'arriver, d'une case voisine, là où elle
 * était.
 */
export function detectTags(previous: readonly Placed[], next: readonly Placed[]): Tag[] {
  const before = new Map(previous.map((p) => [p.id, p]));
  const tags: Tag[] = [];
  for (const victim of next) {
    const was = before.get(victim.id);
    if (!was || steps(was, victim) <= 1) continue;
    const attacker = next.find((p) => {
      const from = before.get(p.id);
      return p.id !== victim.id && from && p.x === was.x && p.y === was.y && steps(from, was) === 1;
    });
    if (attacker) {
      tags.push({
        attackerId: attacker.id,
        victimId: victim.id,
        x: was.x,
        y: was.y,
        color: attacker.color,
      });
    }
  }
  return tags;
}

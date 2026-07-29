const STORAGE_KEY = "duck:anonId";

/**
 * Frontière d'E/S (localStorage) — volontairement non testée unitairement,
 * comme lib/settings.ts#loadSettings. Pas encore de comptes (voir
 * docs/05-comptes-progression.md) : un identifiant anonyme généré une fois
 * et conservé côté navigateur permet quand même d'associer les parties
 * enregistrées (back/src/db.ts) à "quelqu'un", en vue d'une fusion vers un
 * vrai compte plus tard. Propre à CE navigateur/appareil — le vider ou
 * changer d'appareil en génère un nouveau.
 */
export function getOrCreateAnonId(): string {
  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const created = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, created);
    return created;
  } catch {
    return crypto.randomUUID(); // stockage indisponible : un id éphémère plutôt que planter
  }
}

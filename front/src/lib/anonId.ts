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

/**
 * Renouvelle l'identifiant après qu'un compte l'a revendiqué à l'inscription.
 *
 * Sans ça, le navigateur continuait de proposer le MÊME id au compte suivant
 * créé depuis cet appareil : deux comptes distincts se retrouvaient avec la
 * même identité anonyme, et voyaient donc tous les deux le même historique de
 * parties. Le serveur refuse désormais la seconde revendication
 * (db/init/10-anon-id-unique.sql) ; renouveler ici évite en plus que le
 * second compte parte avec un id déjà pris, et donc sans identité anonyme du
 * tout.
 *
 * Frontière d'E/S (localStorage) — volontairement non testée unitairement.
 */
export function renewAnonId(): void {
  try {
    localStorage.setItem(STORAGE_KEY, crypto.randomUUID());
  } catch {
    // Stockage indisponible : l'id était déjà éphémère, rien à renouveler.
  }
}

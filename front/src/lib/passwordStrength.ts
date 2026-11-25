/**
 * Robustesse d'un mot de passe, en **bits d'entropie** : une seule règle, il faut
 * atteindre REQUIRED_BITS. Pas de longueur ni de familles de caractères
 * imposées — une longue phrase en minuscules vaut un court mélange de symboles.
 *
 * Le calcul est le classique `longueur × log2(taille de l'alphabet)`, corrigé
 * de deux naïvetés qui le rendraient trompeur : les répétitions (`aaaaaaaa`
 * n'apporte pas huit fois la même chose) et les suites (`abcdef`, `123456`,
 * `azerty`) qu'une attaque par dictionnaire trouve immédiatement.
 *
 * Ça reste une ESTIMATION : elle ne connaît ni les mots de passe déjà fuités ni
 * les mots du dictionnaire (il faudrait une bibliothèque comme zxcvbn).
 *
 * Le serveur applique le même calcul (back/src/passwordStrength.ts) : les deux
 * copies doivent rester identiques, front/ et back/ ne partageant pas de code.
 */
export const REQUIRED_BITS = 60;

const CHARACTER_SETS = [
  { pattern: /[a-z]/, size: 26 },
  { pattern: /[A-Z]/, size: 26 },
  { pattern: /[0-9]/, size: 10 },
  { pattern: /[^a-zA-Z0-9]/, size: 33 },
];

/** Suites clavier et alphabétiques les plus courantes, dans les deux sens. */
const SEQUENCES = ["abcdefghijklmnopqrstuvwxyz", "0123456789", "azertyuiop", "qwertyuiop"];

function alphabetSize(password: string): number {
  return CHARACTER_SETS.reduce(
    (total, set) => total + (set.pattern.test(password) ? set.size : 0),
    0,
  );
}

/**
 * Longueur "utile" : les caractères qui n'apportent rien de nouveau comptent
 * moitié moins. Sans ça, `aaaaaaaaaaaa` passerait pour aussi solide qu'une
 * suite de douze caractères réellement variés.
 */
function effectiveLength(password: string): number {
  const seen = new Set<string>();
  let length = 0;
  for (const character of password) {
    length += seen.has(character) ? 0.5 : 1;
    seen.add(character);
  }
  return length;
}

/** Nombre de caractères appartenant à une suite connue (`abc`, `123`...). */
function sequentialCharacters(password: string): number {
  const lower = password.toLowerCase();
  let count = 0;
  for (let i = 0; i + 2 < lower.length; i++) {
    const triple = lower.slice(i, i + 3);
    const reversed = [...triple].reverse().join("");
    if (SEQUENCES.some((s) => s.includes(triple) || s.includes(reversed))) count++;
  }
  return count;
}

/** Entropie estimée, en bits. 0 pour un mot de passe vide. */
export function passwordEntropy(password: string): number {
  if (!password) return 0;

  const alphabet = alphabetSize(password);
  if (alphabet === 0) return 0;

  const bitsPerCharacter = Math.log2(alphabet);
  // Chaque caractère pris dans une suite connue est retiré du compte : une
  // attaque qui essaie les suites n'a pas à le deviner.
  const usefulLength = Math.max(0, effectiveLength(password) - sequentialCharacters(password));
  return Math.round(usefulLength * bitsPerCharacter);
}

export function isPasswordAccepted(password: string): boolean {
  return passwordEntropy(password) >= REQUIRED_BITS;
}

/** Bout de la barre : le minimum n'est qu'un repère, on peut faire bien mieux. */
export const FULL_BAR_BITS = 128;

function toPercent(bits: number): number {
  return Math.min(100, Math.floor((bits / FULL_BAR_BITS) * 100));
}

/** Remplissage de la barre. */
export function strengthRatio(password: string): number {
  return toPercent(passwordEntropy(password));
}

/** Position du repère « minimum » sur la barre. */
export const REQUIRED_RATIO = toPercent(REQUIRED_BITS);

/**
 * Même calcul que front/src/lib/passwordStrength.ts (voir ses explications), à
 * garder identique : la jauge guide, seul le serveur protège.
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

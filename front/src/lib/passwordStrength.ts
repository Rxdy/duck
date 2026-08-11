/**
 * Robustesse d'un mot de passe : d'abord un **socle obligatoire**
 * (longueur + quatre familles de caractères), puis une note en **bits
 * d'entropie** au-dessus de ce socle.
 *
 * Les deux se complètent au lieu de se doubler. Le socle écarte les mots de
 * passe que personne ne devrait pouvoir choisir ; l'entropie, elle, récompense
 * ce qui protège vraiment une fois le socle atteint — la longueur et
 * l'imprévisibilité. Sans le socle, `aaaaaaaaaaaaaaaaaaaaaa` passerait ;
 * sans l'entropie, `Aa1!aaaaaa` passerait aussi, alors qu'il ne vaut rien.
 *
 * Le calcul est le classique `longueur × log2(taille de l'alphabet)`, corrigé
 * de deux naïvetés qui le rendraient trompeur :
 *
 * - **les répétitions** (`aaaaaaaa` n'apporte pas huit fois la même chose) ;
 * - **les suites** (`abcdef`, `123456`, `azerty`) qu'une attaque par
 *   dictionnaire trouve immédiatement.
 *
 * Ça reste une ESTIMATION : elle ne connaît pas les mots de passe déjà fuités
 * ni les mots du dictionnaire. `Motdepasse123!` y paraît honnête alors que sa
 * racine est en tête de toutes les listes d'attaque. Une vraie mesure
 * demanderait une bibliothèque dédiée (zxcvbn) et son dictionnaire embarqué.
 */

/**
 * Dix caractères, pas huit. Le socle de quatre familles impose déjà quatre
 * caractères "dépensés" ; à huit il n'en resterait que quatre pour faire la
 * différence, et tout le monde écrirait la même chose.
 */
export const MIN_LENGTH = 10;

const CHARACTER_SETS = [
  { pattern: /[a-z]/, size: 26 },
  { pattern: /[A-Z]/, size: 26 },
  { pattern: /[0-9]/, size: 10 },
  { pattern: /[^a-zA-Z0-9]/, size: 33 },
];

/** Suites clavier et alphabétiques les plus courantes, dans les deux sens. */
const SEQUENCES = ["abcdefghijklmnopqrstuvwxyz", "0123456789", "azertyuiop", "qwertyuiop"];

export interface Requirement {
  key: string;
  /** Formulé comme ce qu'il FAUT, pas comme ce qui manque. */
  label: string;
  met: boolean;
}

/**
 * Socle obligatoire, vérifié avant toute note d'entropie. Chaque exigence est
 * renvoyée avec son état plutôt qu'un simple booléen global : un refus qui ne
 * dit pas ce qui manque oblige le joueur à deviner.
 */
export function requirementsOf(password: string): Requirement[] {
  return [
    { key: "length", label: `${MIN_LENGTH} caractères`, met: password.length >= MIN_LENGTH },
    { key: "lower", label: "une minuscule", met: /[a-z]/.test(password) },
    { key: "upper", label: "une majuscule", met: /[A-Z]/.test(password) },
    { key: "digit", label: "un chiffre", met: /[0-9]/.test(password) },
    { key: "special", label: "un caractère spécial", met: /[^a-zA-Z0-9]/.test(password) },
  ];
}

export function meetsRequirements(password: string): boolean {
  return requirementsOf(password).every((requirement) => requirement.met);
}

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

export interface StrengthLevel {
  /** 0 (le plus faible) à 7 (le plus fort). */
  index: number;
  label: string;
  /** Classe Tailwind du remplissage de la barre. */
  color: string;
  /** Bits à partir desquels ce palier commence. */
  from: number;
}

/**
 * Huit paliers plutôt que trois : une barre qui passe de "faible" à "fort" en
 * un caractère n'apprend rien, alors qu'une progression fine montre que
 * rallonger paie.
 *
 * L'échelle est calée sur le socle obligatoire : dix caractères puisant dans
 * les quatre familles valent déjà ~66 bits, donc « Presque correct » commence
 * là. Les trois premiers paliers ne décrivent que des mots de passe encore
 * refusés — ils existent pour que la barre bouge pendant la frappe.
 */
export const STRENGTH_LEVELS: StrengthLevel[] = [
  { index: 0, label: "Beaucoup trop faible", color: "bg-red-600", from: 0 },
  { index: 1, label: "Très faible", color: "bg-red-500", from: 25 },
  { index: 2, label: "Faible", color: "bg-orange-500", from: 45 },
  { index: 3, label: "Presque correct", color: "bg-amber-500", from: 65 },
  { index: 4, label: "Correct", color: "bg-yellow-400", from: 85 },
  { index: 5, label: "Solide", color: "bg-lime-500", from: 105 },
  { index: 6, label: "Excellent", color: "bg-emerald-500", from: 130 },
  { index: 7, label: "Redoutable", color: "bg-cyan-400", from: 160 },
];

/** Palier à partir duquel l'entropie est jugée suffisante. */
export const ACCEPTED_LEVEL = 3;

/**
 * Entropie à laquelle la barre est pleine : le dernier palier. Un plafond plus
 * bas rendrait la barre pleine avant le meilleur palier, et il n'y aurait plus
 * rien à montrer au joueur qui veut faire mieux.
 */
export const FULL_BAR_BITS = STRENGTH_LEVELS[STRENGTH_LEVELS.length - 1]!.from;

export function strengthOf(password: string): StrengthLevel {
  const bits = passwordEntropy(password);
  return [...STRENGTH_LEVELS].reverse().find((level) => bits >= level.from) ?? STRENGTH_LEVELS[0]!;
}

/** Remplissage de la barre, en pourcentage. Continue, jamais au-delà de 100. */
export function strengthRatio(password: string): number {
  return Math.min(100, Math.round((passwordEntropy(password) / FULL_BAR_BITS) * 100));
}

/**
 * Le socle ET l'entropie. Les deux sont nécessaires : le socle laisse encore
 * passer `Aaaaaaaaa1!` (onze caractères, quatre familles, mais neuf fois la
 * même lettre), que l'entropie, elle, refuse.
 */
export function isPasswordAccepted(password: string): boolean {
  return meetsRequirements(password) && strengthOf(password).index >= ACCEPTED_LEVEL;
}

/**
 * Le code joueur : 6 caractères hexadécimaux, unique, attribué par la base
 * (db/init/15-player-tag.sql). Il s'affiche après le pseudo (« Léa#A3F9C2 »),
 * mais suffit seul pour trouver quelqu'un.
 */
const CODE = /^[^#]*#([0-9a-f]{6})$|^([0-9a-f]{6})$/i;

/** Le code dans « A3F9C2 », « #A3F9C2 » ou « Léa#A3F9C2 » ; `undefined` sinon. */
export function parseTag(text: string): string | undefined {
  const found = CODE.exec(text.trim());
  return (found?.[1] ?? found?.[2])?.toUpperCase();
}

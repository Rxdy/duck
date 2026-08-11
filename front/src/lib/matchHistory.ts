/**
 * Mise en forme du récapitulatif de parties de la page Compte.
 *
 * Tout est ici plutôt que dans les composants pour une raison simple : ce sont
 * des règles de lecture ("une partie d'hier ne s'écrit pas comme une partie de
 * l'an dernier"), et elles se testent sans monter de composant.
 */

export interface MatchRecapPlayer {
  name: string;
  color: string;
  score: number;
  isWinner: boolean;
  /** Le joueur qui consulte, pour le distinguer de ses adversaires. */
  isMe: boolean;
}

export interface MatchRecap {
  id: string;
  mapName: string;
  /** null pour les parties d'avant l'enregistrement du mode. Voir modeLabel. */
  mode: string | null;
  durationMs: number | null;
  /** Date ISO renvoyée par le serveur. */
  playedAt: string;
  /** Déjà triés par score décroissant côté serveur (voir back/src/db.ts). */
  players: MatchRecapPlayer[];
}

/**
 * Trois parties visibles au départ : assez pour reconnaître ses dernières
 * sessions, assez peu pour que les statistiques restent à l'écran sans
 * défiler. Le reste est à un clic.
 */
export const DEFAULT_VISIBLE_MATCHES = 3;

const MODE_LABELS: Record<string, string> = {
  duel: "Duel",
  ffa3: "FFA 3 joueurs",
  ffa4: "FFA 4 joueurs",
};

/**
 * Libellé du mode. Les parties enregistrées avant que le mode ne soit stocké
 * n'en ont pas : on le déduit de l'effectif, qui suffit aujourd'hui à
 * distinguer les trois modes. Inventer "Duel" par défaut afficherait un mode
 * faux sur une partie à quatre.
 */
export function modeLabel(mode: string | null, playerCount: number): string {
  if (mode && MODE_LABELS[mode]) return MODE_LABELS[mode];
  if (playerCount >= 2) return `Partie à ${playerCount}`;
  return "Partie";
}

/**
 * Durée lisible : `2 min 05 s`, `48 s`. Les secondes sont complétées à deux
 * chiffres au-delà de la minute pour que deux durées s'alignent à l'œil.
 * Tiret quand la durée n'a pas été mesurée — une donnée absente doit se dire
 * absente plutôt que de s'afficher "0 s".
 */
export function formatDuration(durationMs: number | null): string {
  if (durationMs === null || durationMs < 0) return "—";

  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds} s`;
  return `${minutes} min ${String(seconds).padStart(2, "0")} s`;
}

const MONTHS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function clockTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

/**
 * Quand la partie a été jouée : `Aujourd'hui à 19:42`, `Hier à 21:03`, sinon
 * `8 août à 19:42` (l'année n'apparaît que si ce n'est pas l'année en cours).
 *
 * Les mois sont écrits à la main plutôt que délégués à `Intl` : la liste tient
 * en douze entrées, et le rendu ne dépend alors ni des données de locale
 * installées ni de la version de Node.
 *
 * `now` est injectable pour que "aujourd'hui" soit testable.
 */
export function formatPlayedAt(playedAt: string, now: Date = new Date()): string {
  const date = new Date(playedAt);
  if (Number.isNaN(date.getTime())) return "—";

  const time = clockTime(date);
  if (sameDay(date, now)) return `Aujourd'hui à ${time}`;

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (sameDay(date, yesterday)) return `Hier à ${time}`;

  const day = `${date.getDate()} ${MONTHS[date.getMonth()]}`;
  const year = date.getFullYear() === now.getFullYear() ? "" : ` ${date.getFullYear()}`;
  return `${day}${year} à ${time}`;
}

/** Le joueur qui consulte, s'il figure bien dans la partie. */
export function meIn(match: MatchRecap): MatchRecapPlayer | undefined {
  return match.players.find((player) => player.isMe);
}

/**
 * A-t-il gagné cette partie ? Distinct de "être premier au score" : en cas
 * d'égalité, le vainqueur est celui désigné par le serveur.
 */
export function didWin(match: MatchRecap): boolean {
  return meIn(match)?.isWinner ?? false;
}

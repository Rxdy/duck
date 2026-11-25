import type { GameRoom } from "./room.js";
import type { GameMode } from "./shared.js";

/**
 * Combien de temps une salle attend des humains avant de compléter avec des
 * bots (voir Backlog §1). Assez long pour que deux joueurs qui cliquent à
 * quelques secondes d'écart se trouvent, assez court pour qu'un joueur seul
 * ne croie pas le serveur en panne — c'est le seul retour qu'il a.
 */
export const WAIT_FOR_HUMANS_MS = 10_000;

/** Salle qui réunit encore ses joueurs, avec le délai armé qui la fera partir. */
interface PendingRoom {
  room: GameRoom;
  timer: ReturnType<typeof setTimeout>;
  /**
   * Complète les places restées vides avant le départ. Fourni par l'appelant
   * (voir index.ts) : le matchmaker place des joueurs, il ne sait rien des
   * bots, des cartes ni de la base — c'est ce qui le rend testable sans eux.
   */
  fill: () => Promise<void>;
}

/** Décompte 3-2-1 affiché au départ (voir front/src/lib/countdown.ts). */
export const COUNTDOWN_MS = 3000;

/**
 * Réunit dans une même salle les joueurs qui cherchent une partie dans le
 * même mode.
 *
 * Une seule salle est ouverte par mode à la fois : celle qui attend. Dès
 * qu'elle part, la suivante s'ouvre au prochain arrivant. Deux salles du même
 * mode qui attendraient en parallèle se voleraient les joueurs et allongeraient
 * l'attente des deux.
 *
 * Une salle PARTIE ne se rejoint plus jamais. C'est ce qui distingue ce
 * mécanisme de l'ancien « lobby » constant retiré avant lui : celui-ci gardait
 * indéfiniment la même salle, donc les bots de la partie précédente restaient
 * dans la liste des joueurs et décalaient l'attribution des couleurs, et la
 * carte tirée à la première partie ne changeait plus jamais. Ici chaque salle
 * naît avec sa carte, se remplit, part, et est oubliée.
 */
export class Matchmaker {
  private readonly pending = new Map<GameMode, PendingRoom>();

  constructor(private readonly waitMs: number = WAIT_FOR_HUMANS_MS) {}

  /**
   * La salle du mode qui a encore une place, ou `undefined` s'il faut en
   * ouvrir une neuve.
   */
  find(mode: GameMode): GameRoom | undefined {
    const pending = this.pending.get(mode);
    if (!pending) return undefined;
    if (pending.room.isStarted || pending.room.isFull) return undefined;
    return pending.room;
  }

  /**
   * Met une salle neuve en attente et arme son départ. `fill` sera appelé
   * juste avant, pour compléter les places vides.
   */
  hold(mode: GameMode, room: GameRoom, fill: () => Promise<void>): void {
    const timer = setTimeout(() => {
      this.start(mode);
    }, this.waitMs);
    // Un délai en attente ne doit pas à lui seul empêcher le process de
    // s'arrêter (arrêt propre, tests) : la partie n'a pas encore commencé,
    // elle ne vaut pas la peine qu'on retienne le serveur pour elle.
    timer.unref?.();
    this.pending.set(mode, { room, timer, fill });
    room.openForWaiting(Date.now() + this.waitMs);
  }

  /**
   * À appeler après chaque arrivée : une salle pleine part sans attendre la
   * fin du délai. Sans ça, quatre joueurs réunis en deux secondes en
   * regarderaient huit de plus s'écouler pour rien.
   */
  settle(mode: GameMode): void {
    if (this.pending.get(mode)?.room.isFull) this.start(mode);
  }

  /**
   * Le dernier humain d'une salle en attente s'en va : la salle n'a plus
   * personne à faire jouer, on désarme son départ plutôt que de laisser des
   * bots démarrer une partie que personne ne regarde.
   */
  release(mode: GameMode, room: GameRoom): void {
    const pending = this.pending.get(mode);
    if (pending?.room !== room) return;
    if (room.humanCount > 0) return;
    clearTimeout(pending.timer);
    this.pending.delete(mode);
  }

  /** Désarme tous les délais en attente (arrêt du serveur, tests). */
  clear(): void {
    for (const pending of this.pending.values()) clearTimeout(pending.timer);
    this.pending.clear();
  }

  /**
   * Sort la salle de l'attente et la fait partir. Retirée de `pending` AVANT
   * le remplissage, qui est asynchrone : sans ça un joueur arrivé pendant
   * l'attribution des bots prendrait une place déjà promise à l'un d'eux.
   */
  private start(mode: GameMode): void {
    const pending = this.pending.get(mode);
    if (!pending) return;
    clearTimeout(pending.timer);
    this.pending.delete(mode);

    // Le départ n'est pas conditionné à la réussite du remplissage : une base
    // indisponible doit donner une partie avec moins d'adversaires, jamais une
    // salle qui ne part pas et laisse ses joueurs devant un écran d'attente
    // qui ne finit plus.
    pending
      .fill()
      .catch((error: unknown) => {
        console.error("Échec du remplissage de la salle :", error);
      })
      .finally(() => {
        pending.room.start(COUNTDOWN_MS);
      });
  }
}

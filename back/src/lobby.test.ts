import { describe, expect, it } from "vitest";
import { LobbyRegistry, type LobbyGameOptions, type LobbyPlayer } from "./lobby.js";
import type { LobbyState, ServerMessage } from "./protocol.js";

function player(name: string, accountId = name) {
  const inbox: ServerMessage[] = [];
  const member: LobbyPlayer = {
    playerId: `p-${name}`,
    accountId,
    username: name,
    tag: name.toUpperCase(),
    outfit: [],
    send: (message) => inbox.push(message),
  };
  const state = (): LobbyState =>
    inbox.flatMap((m) => (m.type === "LOBBY" ? [m.lobby] : [])).at(-1)!;
  return { ...member, inbox, state };
}

function registry() {
  const started: LobbyGameOptions[] = [];
  const left: string[] = [];
  const lobbies = new LobbyRegistry((options) => {
    started.push(options);
    return { leave: (id) => left.push(id) };
  });
  return { lobbies, started, left };
}

describe("salons", () => {
  it("réunit les joueurs par le code, quelle que soit sa casse, jusqu'à la capacité", () => {
    const { lobbies } = registry();
    const [host, guest, third] = [player("ana"), player("bo"), player("cy")];
    const code = lobbies.create(host, "duel");

    expect(lobbies.join(guest, code.toLowerCase())).toBeUndefined();
    expect(host.state().players.map((p) => p.username)).toEqual(["ana", "bo"]);
    expect(lobbies.join(third, code)).toContain("complet");
    expect(lobbies.join(third, "ZZZZZZ")).toContain("n'existe plus");
  });

  it("réserve les réglages et le départ à l'hôte, et attend que toutes les places soient prises", () => {
    const { lobbies, started } = registry();
    const [host, guest] = [player("ana"), player("bo")];
    const code = lobbies.create(host, "ffa4");
    lobbies.join(guest, code);

    lobbies.configure(guest.playerId, { bots: 2 });
    expect(host.state().bots).toBe(0);
    lobbies.start(host.playerId);
    expect(started).toHaveLength(0);

    lobbies.configure(host.playerId, { bots: 9 });
    expect(host.state().bots).toBe(2);
    lobbies.start(guest.playerId);
    expect(started).toHaveLength(0);
    lobbies.start(host.playerId);

    expect(started[0]).toMatchObject({ mode: "ffa4", bots: 2 });
    expect(guest.state().playing).toBe(true);
  });

  it("retire un bot quand un joueur arrive, et refuse un mode trop petit", () => {
    const { lobbies } = registry();
    const [host, a, b] = [player("ana"), player("bo"), player("cy")];
    const code = lobbies.create(host, "ffa4");
    lobbies.configure(host.playerId, { bots: 3 });

    lobbies.join(a, code);
    lobbies.join(b, code);
    expect(host.state().bots).toBe(1);

    lobbies.configure(host.playerId, { mode: "duel" });
    expect(host.state().mode).toBe("ffa4");
  });

  it("rouvre le salon à la fin de la partie", () => {
    const { lobbies, started } = registry();
    const host = player("ana");
    lobbies.create(host, "duel");
    lobbies.configure(host.playerId, { bots: 1 });
    lobbies.start(host.playerId);

    started[0]!.onEnd();

    expect(host.state().playing).toBe(false);
  });

  it("passe la main quand l'hôte part, et ferme le salon vide", () => {
    const { lobbies } = registry();
    const [host, guest, late] = [player("ana"), player("bo"), player("cy")];
    const code = lobbies.create(host, "duel");
    lobbies.join(guest, code);

    lobbies.leave(host.playerId);
    expect(guest.state().players.map((p) => p.username)).toEqual(["bo"]);
    lobbies.leave(guest.playerId);

    expect(lobbies.join(late, code)).toContain("n'existe plus");
  });

  it("met fin à la partie quand il ne reste plus d'adversaire", () => {
    const { lobbies, left } = registry();
    const [host, guest] = [player("ana"), player("bo")];
    const code = lobbies.create(host, "duel");
    lobbies.join(guest, code);
    lobbies.start(host.playerId);

    lobbies.leave(guest.playerId);

    expect(left).toEqual([guest.playerId]);
    expect(host.state().playing).toBe(false);
  });

  it("ne donne pas deux places au même compte ouvert deux fois", () => {
    const { lobbies } = registry();
    const [host, again] = [player("ana"), { ...player("ana2", "ana"), username: "ana" }];
    const code = lobbies.create(host, "duel");

    expect(lobbies.join(again, code)).toBeUndefined();
    expect(host.inbox.at(-1)?.type).toBe("LOBBY_CLOSED");
  });

  it("montre l'invitation à l'ami invité, puis la retire quand il entre ou refuse", () => {
    const { lobbies } = registry();
    const [host, friend] = [player("ana"), player("bo")];
    const code = lobbies.create(host, "duel");

    lobbies.invite(host.playerId, { accountId: friend.accountId, tag: friend.tag });
    expect(lobbies.invitesFor(friend.accountId)).toEqual([{ code, mode: "duel", from: "ana" }]);
    lobbies.decline(friend.accountId, code);
    expect(lobbies.invitesFor(friend.accountId)).toEqual([]);

    lobbies.invite(host.playerId, { accountId: friend.accountId, tag: friend.tag });
    lobbies.join(friend, code);
    expect(lobbies.invitesFor(friend.accountId)).toEqual([]);
    expect(host.state().invited).toEqual([]);
  });
});

import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useGameStore } from "../store/gameStore.js";
import { leaveMatch, searchMatch, sendMove } from "./matchSession.js";

vi.mock("./audio.js", () => ({
  playArcadeStartJingle: vi.fn(),
  playScoreSfx: vi.fn(),
  startAmbientLoop: vi.fn(),
  stopAmbientLoop: vi.fn(),
}));

class FakeSocket extends EventTarget {
  static OPEN = 1;
  static all: FakeSocket[] = [];
  readyState = 1;
  sent: { type: string; mode?: string }[] = [];
  closed = false;
  constructor() {
    super();
    FakeSocket.all.push(this);
  }
  send(raw: string) {
    this.sent.push(JSON.parse(raw));
  }
  close() {
    this.closed = true;
  }
  receive(message: unknown) {
    this.dispatchEvent(new MessageEvent("message", { data: JSON.stringify(message) }));
  }
}

describe("matchSession", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    FakeSocket.all = [];
    vi.stubGlobal("WebSocket", FakeSocket);
  });
  afterEach(() => {
    leaveMatch();
    vi.unstubAllGlobals();
  });

  it("cherche une partie, puis la dit prête au premier STATE", () => {
    const store = useGameStore();
    searchMatch("duel");
    const socket = FakeSocket.all[0]!;
    socket.dispatchEvent(new Event("open"));
    expect(socket.sent[0]).toMatchObject({ type: "JOIN", mode: "duel" });

    socket.receive({ type: "WAITING", players: [], capacity: 2, startsInMs: 8000 });
    expect(store.queue?.mode).toBe("duel");
    expect(store.playableAt).toBeNull();

    socket.receive({ type: "STATE", players: [], countdownMs: 3000 });
    expect(store.playableAt).toBeGreaterThan(Date.now());

    sendMove("UP");
    expect(socket.sent.at(-1)).toEqual({ type: "MOVE", direction: "UP" });
  });

  it("quitter la file ferme la connexion et ignore ce qui arrive ensuite", () => {
    const store = useGameStore();
    searchMatch("ffa4");
    const socket = FakeSocket.all[0]!;

    leaveMatch();
    socket.receive({ type: "STATE", players: [] });

    expect(socket.closed).toBe(true);
    expect(store.queue).toBeNull();
    expect(store.playableAt).toBeNull();
  });
});

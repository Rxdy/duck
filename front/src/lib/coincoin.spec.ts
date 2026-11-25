import { describe, expect, it } from "vitest";
import { Mesh, type MeshLambertMaterial } from "three";
import { PLAYER_COLORS } from "../theme.js";
import {
  ANTENNA_BEAT_MS,
  ANTENNA_COLORS,
  antennaColor,
  createCoincoin,
  easeInOut,
  headingFor,
  shouldGlide,
  turnTowards,
} from "./coincoin.js";

describe("antennes", () => {
  it("passent par les 4 couleurs dans l'ordre, puis recommencent", () => {
    const seen = [0, 1, 2, 3, 4].map((beat) => antennaColor(beat * ANTENNA_BEAT_MS));
    expect(seen).toEqual([...ANTENNA_COLORS, ANTENNA_COLORS[0]]);
  });

  it("restent allumées jusqu'au changement de couleur", () => {
    expect(antennaColor(ANTENNA_BEAT_MS - 1)).toBe(ANTENNA_COLORS[0]);
  });

  it("changent moins vite quand les animations sont réduites", () => {
    expect(antennaColor(ANTENNA_BEAT_MS, true)).toBe(ANTENNA_COLORS[0]);
  });
});

describe("mouvement", () => {
  it("adoucit le départ et l'arrivée", () => {
    expect([easeInOut(0), easeInOut(0.5), easeInOut(1)]).toEqual([0, 0.5, 1]);
    expect(easeInOut(0.1)).toBeLessThan(0.1);
    expect(easeInOut(0.9)).toBeGreaterThan(0.9);
  });

  it("ne fait glisser que vers une case voisine", () => {
    expect(shouldGlide(1, 0)).toBe(true);
    expect(shouldGlide(0, -1)).toBe(true);
    expect(shouldGlide(5, 2)).toBe(false);
  });

  it("tourne le bec dans le sens du pas, par le plus court chemin", () => {
    expect(headingFor(1, 0)).toBeCloseTo(Math.PI / 2);
    expect(headingFor(0, 0)).toBeUndefined();
    expect(turnTowards(Math.PI * 0.9, -Math.PI * 0.9, 1)).toBeCloseTo(Math.PI * 1.1);
  });
});

describe("createCoincoin", () => {
  it("se construit et se libère", () => {
    const duck = createCoincoin(PLAYER_COLORS[0]);
    expect(duck.group.children.filter((child) => child instanceof Mesh).length).toBeGreaterThan(10);
    duck.dispose();
  });

  it("devient translucide puis redevient opaque", () => {
    const duck = createCoincoin(PLAYER_COLORS[1]);
    const material = (duck.group.children[0] as Mesh).material as MeshLambertMaterial;
    duck.setOpacity(0.6);
    expect([material.transparent, material.opacity]).toEqual([true, 0.6]);
    duck.setOpacity(1);
    expect([material.transparent, material.opacity]).toEqual([false, 1]);
    duck.dispose();
  });

  it("n'utilise plus de violet parmi les couleurs de joueur", () => {
    expect(PLAYER_COLORS).not.toContain("#9B5DE5");
  });
});

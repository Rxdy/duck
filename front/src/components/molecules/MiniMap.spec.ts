import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import MiniMap from "./MiniMap.vue";

describe("MiniMap", () => {
  const wrapper = mount(MiniMap, {
    props: {
      width: 4,
      height: 3,
      tiles: [
        { x: 0, y: 0, kind: "wall" },
        { x: 1, y: 1, kind: "empty" },
      ],
      players: [
        { id: "me", x: 1, y: 1, color: "#FF4D6D" },
        { id: "other", x: 2, y: 1, color: "#00C2D1" },
      ],
      meId: "me",
    },
  });

  it("dessine les murs et tous les joueurs, le sien distingué", () => {
    expect(wrapper.findAll("polygon")).toHaveLength(2); // le contour et un mur
    expect(wrapper.findAll("circle")).toHaveLength(2);
    expect(wrapper.findAll("[data-me]")).toHaveLength(1);
  });

  it("est orientée comme le plateau : monter va en haut à droite", () => {
    const [me, other] = wrapper.findAll("circle");
    // L'autre est un cran à droite sur la grille : en bas à droite à l'écran.
    expect(Number(other!.attributes("cx"))).toBeGreaterThan(Number(me!.attributes("cx")));
    expect(Number(other!.attributes("cy"))).toBeGreaterThan(Number(me!.attributes("cy")));
  });
});

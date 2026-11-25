import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import DirectionPad from "./DirectionPad.vue";

describe("DirectionPad", () => {
  it("envoie la direction dès que le doigt touche le bouton", async () => {
    const wrapper = mount(DirectionPad);

    for (const direction of ["UP", "DOWN", "LEFT", "RIGHT"]) {
      await wrapper.get(`[data-direction="${direction}"]`).trigger("pointerdown");
    }

    expect(wrapper.emitted("move")).toEqual([["UP"], ["DOWN"], ["LEFT"], ["RIGHT"]]);
  });
});

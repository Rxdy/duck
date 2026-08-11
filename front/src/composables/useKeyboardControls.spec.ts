import { describe, expect, it, vi } from "vitest";
import { defineComponent } from "vue";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { useKeyboardControls } from "./useKeyboardControls.js";

function mountWithControls(move: (direction: string) => void) {
  setActivePinia(createPinia());
  return mount(
    defineComponent({
      setup() {
        useKeyboardControls(move as never);
        return () => null;
      },
    }),
  );
}

describe("useKeyboardControls", () => {
  it("déplace le joueur à chaque appui sur une touche de direction", () => {
    const move = vi.fn();
    const wrapper = mountWithControls(move);

    window.dispatchEvent(new KeyboardEvent("keydown", { code: "ArrowRight" }));
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "ArrowRight" }));

    expect(move).toHaveBeenCalledTimes(2);
    expect(move).toHaveBeenLastCalledWith("RIGHT");
    wrapper.unmount();
  });

  it("ignore l'auto-repeat d'une touche maintenue", () => {
    const move = vi.fn();
    const wrapper = mountWithControls(move);

    window.dispatchEvent(new KeyboardEvent("keydown", { code: "ArrowRight" }));
    // Le système émet ensuite des keydown en rafale tant que la touche reste
    // enfoncée : les compter donnerait au joueur qui ne fait rien plus de
    // déplacements qu'à celui qui martèle la touche.
    for (let i = 0; i < 20; i++) {
      window.dispatchEvent(new KeyboardEvent("keydown", { code: "ArrowRight", repeat: true }));
    }

    expect(move).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it("n'écoute plus une fois le composant démonté", () => {
    const move = vi.fn();
    mountWithControls(move).unmount();

    window.dispatchEvent(new KeyboardEvent("keydown", { code: "ArrowRight" }));

    expect(move).not.toHaveBeenCalled();
  });
});

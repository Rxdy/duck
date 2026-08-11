import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import MapActionSheet from "./MapActionSheet.vue";
import type { SavedMap } from "../../lib/mapsApi.js";

const map: SavedMap = {
  id: "a",
  name: "Le grand couloir",
  width: 15,
  height: 11,
  tiles: [],
  spawnCount: 2,
  updatedAt: "2026-01-01",
};

function buttonLabelled(wrapper: ReturnType<typeof mount>, text: string) {
  return wrapper.findAll("button").find((b) => b.text().includes(text));
}

describe("MapActionSheet", () => {
  it("offers every action the map supports", () => {
    const wrapper = mount(MapActionSheet, { props: { map } });

    for (const label of ["Modifier", "Voir un aperçu", "Exporter", "Supprimer"]) {
      expect(buttonLabelled(wrapper, label), label).toBeDefined();
    }
  });

  it("emits the chosen action", async () => {
    const wrapper = mount(MapActionSheet, { props: { map } });

    await buttonLabelled(wrapper, "Modifier")!.trigger("click");
    await buttonLabelled(wrapper, "Voir un aperçu")!.trigger("click");
    await buttonLabelled(wrapper, "Exporter")!.trigger("click");

    expect(wrapper.emitted("edit")).toHaveLength(1);
    expect(wrapper.emitted("preview")).toHaveLength(1);
    expect(wrapper.emitted("export")).toHaveLength(1);
  });

  it("never deletes on the first tap", async () => {
    // A map is work, and nothing here can bring it back: one slipped thumb
    // must not be enough.
    const wrapper = mount(MapActionSheet, { props: { map } });
    await buttonLabelled(wrapper, "Supprimer")!.trigger("click");

    expect(wrapper.emitted("delete")).toBeUndefined();
    expect(wrapper.text()).toContain("C'est définitif");
  });

  it("deletes once confirmed", async () => {
    const wrapper = mount(MapActionSheet, { props: { map } });
    await buttonLabelled(wrapper, "Supprimer")!.trigger("click");
    await buttonLabelled(wrapper, "Supprimer définitivement")!.trigger("click");

    expect(wrapper.emitted("delete")).toHaveLength(1);
  });

  it("lets the player back out of a confirmation", async () => {
    const wrapper = mount(MapActionSheet, { props: { map } });
    await buttonLabelled(wrapper, "Supprimer")!.trigger("click");
    await buttonLabelled(wrapper, "Annuler")!.trigger("click");

    expect(wrapper.emitted("delete")).toBeUndefined();
    expect(buttonLabelled(wrapper, "Modifier")).toBeDefined();
  });

  it("closes when tapping outside the sheet", async () => {
    const wrapper = mount(MapActionSheet, { props: { map } });
    await wrapper.find('[role="dialog"]').trigger("click");

    expect(wrapper.emitted("close")).toHaveLength(1);
  });
});

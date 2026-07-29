import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import SavedMapsList from "./SavedMapsList.vue";
import type { SavedMap } from "../../lib/savedMaps.js";

const maps: SavedMap[] = [
  { id: "a", name: "Carte A", width: 15, height: 9, tiles: [], updatedAt: "2026-01-01" },
  { id: "b", name: "Carte B", width: 20, height: 20, tiles: [], updatedAt: "2026-01-02" },
];

describe("SavedMapsList", () => {
  it("shows an empty state when there are no saved maps", () => {
    const wrapper = mount(SavedMapsList, { props: { maps: [] } });
    expect(wrapper.text()).toContain("Aucune carte enregistrée");
  });

  it("lists every saved map with its dimensions", () => {
    const wrapper = mount(SavedMapsList, { props: { maps } });
    expect(wrapper.findAll("li")).toHaveLength(2);
    expect(wrapper.text()).toContain("Carte A");
    expect(wrapper.text()).toContain("15×9");
  });

  it("highlights the active map", () => {
    const wrapper = mount(SavedMapsList, { props: { maps, activeId: "b" } });
    const items = wrapper.findAll("li");
    expect(items[1]!.classes()).toContain("bg-cyan-500/20");
    expect(items[0]!.classes()).not.toContain("bg-cyan-500/20");
  });

  it("emits load with the clicked map's id", async () => {
    const wrapper = mount(SavedMapsList, { props: { maps } });
    await wrapper.get("li button").trigger("click");
    expect(wrapper.emitted("load")).toEqual([["a"]]);
  });

  it("emits delete when the delete button is clicked", async () => {
    const wrapper = mount(SavedMapsList, { props: { maps } });
    await wrapper.get('button[aria-label="Supprimer"]').trigger("click");
    expect(wrapper.emitted("delete")).toEqual([["a"]]);
  });
});

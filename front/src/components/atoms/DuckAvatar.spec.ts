import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import DuckAvatar from "./DuckAvatar.vue";

describe("DuckAvatar", () => {
  it("reprend l'icône d'onglet à côté du titre", () => {
    expect(mount(DuckAvatar).get("img").attributes("src")).toBe("/favicon.svg");
  });
});

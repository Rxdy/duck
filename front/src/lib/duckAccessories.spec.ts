import { describe, expect, it } from "vitest";
import { accessoryIcon, accessoryLabel, toAccessoryKind } from "./duckAccessories.js";

describe("toAccessoryKind", () => {
  it("recognizes every known accessory", () => {
    expect(toAccessoryKind("none")).toBe("none");
    expect(toAccessoryKind("top-hat")).toBe("top-hat");
    expect(toAccessoryKind("cap")).toBe("cap");
    expect(toAccessoryKind("crown")).toBe("crown");
  });

  it("falls back to none for an unknown value instead of crashing the 3D render", () => {
    expect(toAccessoryKind("monocle")).toBe("none");
    expect(toAccessoryKind("")).toBe("none");
  });
});

describe("accessoryLabel", () => {
  it("gives every accessory a French label", () => {
    expect(accessoryLabel("none")).toBe("Aucun");
    expect(accessoryLabel("top-hat")).toBe("Haut-de-forme");
    expect(accessoryLabel("cap")).toBe("Casquette");
    expect(accessoryLabel("crown")).toBe("Couronne");
  });
});

describe("accessoryIcon", () => {
  it("gives every accessory a distinct icon", () => {
    const icons = new Set(
      (["none", "top-hat", "cap", "crown"] as const).map((accessory) => accessoryIcon(accessory)),
    );
    expect(icons.size).toBe(4);
  });
});

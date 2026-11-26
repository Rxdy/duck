import { afterEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter, RouterLink } from "vue-router";
import AppHeader from "./AppHeader.vue";

const empty = { template: "<div/>" };
const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    "/",
    "/profil",
    "/compte",
    "/canard",
    "/amis",
    "/options",
    "/credits",
    "/inscription",
    "/connexion",
  ].map((path) => ({ path, component: empty })),
});

function mountHeader(props: { username?: string; friendRequests?: number } = {}) {
  return mount(AppHeader, { props, global: { plugins: [router] } });
}

const destinations = (wrapper: ReturnType<typeof mountHeader>) =>
  wrapper.findAllComponents(RouterLink).map((link) => link.props("to"));

/** Un ordinateur : grand écran et souris. Sans ça, on est sur téléphone. */
function onDesktop() {
  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

describe("AppHeader", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sur téléphone, n'a que la marque et le profil, qui mène à sa page", async () => {
    const wrapper = mountHeader({ username: "deeps" });

    expect(destinations(wrapper)).toEqual(["/", "/profil"]);
    await wrapper.get("[data-profile]").trigger("click");
    expect(wrapper.find("nav").exists()).toBe(false);
  });

  it("sur ordinateur, déroule un menu avec tout ce qui n'est pas le jeu", async () => {
    onDesktop();
    const wrapper = mountHeader({ username: "deeps" });
    expect(destinations(wrapper)).toEqual(["/"]);

    await wrapper.get("[data-profile]").trigger("click");

    expect(destinations(wrapper)).toEqual([
      "/",
      "/canard",
      "/compte",
      "/amis",
      "/options",
      "/credits",
    ]);
    expect(wrapper.text()).toContain("Se déconnecter");
  });

  it("propose à un invité de s'inscrire ou se connecter, sans déconnexion", async () => {
    onDesktop();
    const wrapper = mountHeader();
    await wrapper.get("[data-profile]").trigger("click");

    expect(destinations(wrapper)).toEqual([
      "/",
      "/inscription",
      "/connexion",
      "/options",
      "/credits",
    ]);
    expect(wrapper.text()).not.toContain("Se déconnecter");
  });

  it("montre le canard en entier sur le bouton, avec le pseudo", () => {
    const wrapper = mountHeader({ username: "deeps" });
    expect(wrapper.get("[data-profile] img").attributes("src")).toBe("/ducks/rouge.png");
    expect(wrapper.text()).toContain("deeps");
  });

  it("signale les demandes d'ami reçues", () => {
    expect(mountHeader({ username: "deeps", friendRequests: 2 }).get("[data-badge]").text()).toBe(
      "2",
    );
    expect(mountHeader({ username: "deeps" }).find("[data-badge]").exists()).toBe(false);
  });

  it("laisse la page décider quoi faire de la déconnexion", async () => {
    onDesktop();
    const wrapper = mountHeader({ username: "deeps" });
    await wrapper.get("[data-profile]").trigger("click");
    await wrapper.get("nav button").trigger("click");

    expect(wrapper.emitted("logout")).toHaveLength(1);
    expect(wrapper.find("nav").exists()).toBe(false);
  });
});

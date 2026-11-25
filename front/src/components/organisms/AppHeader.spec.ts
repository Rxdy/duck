import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter, RouterLink } from "vue-router";
import AppHeader from "./AppHeader.vue";

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: "/", component: { template: "<div/>" } },
    { path: "/compte", component: { template: "<div/>" } },
    { path: "/connexion", component: { template: "<div/>" } },
  ],
});

function mountHeader(username?: string) {
  return mount(AppHeader, { props: { username }, global: { plugins: [router] } });
}

describe("AppHeader", () => {
  it("n'expose qu'UNE porte vers le compte, pas deux", () => {
    // Il y avait avant une pastille d'initiale ET une vignette canard menant
    // aux skins : deux boutons pour la même destination, sans qu'on sache
    // lequel mène où.
    const wrapper = mountHeader("deeps");
    const destinations = wrapper.findAllComponents(RouterLink).map((l) => l.props("to"));
    expect(destinations).toEqual(["/", "/compte"]);
  });

  it("affiche le pseudo à côté de l'icône quand on est connecté", () => {
    const wrapper = mountHeader("deeps");
    expect(wrapper.find('[aria-label="Profil de deeps"]').exists()).toBe(true);
    expect(wrapper.text()).toContain("deeps");
  });

  it("mène à la connexion quand personne n'est connecté", () => {
    const wrapper = mountHeader();
    const destinations = wrapper.findAllComponents(RouterLink).map((l) => l.props("to"));
    expect(destinations).toEqual(["/", "/connexion"]);
    expect(wrapper.find('[aria-label="Se connecter"]').exists()).toBe(true);
  });

  it("propose la déconnexion, mais seulement une fois connecté", () => {
    expect(mountHeader().find('[aria-label="Se déconnecter"]').exists()).toBe(false);
    expect(mountHeader("deeps").find('[aria-label="Se déconnecter"]').exists()).toBe(true);
  });

  it("laisse la page décider quoi faire de la déconnexion", async () => {
    const wrapper = mountHeader("deeps");
    await wrapper.find('[aria-label="Se déconnecter"]').trigger("click");
    expect(wrapper.emitted("logout")).toHaveLength(1);
  });
});

/* eslint-disable vue/one-component-per-file -- deux pages de test, déclarées sur place pour le routeur. */
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent, h, nextTick, ref } from "vue";
import { createMemoryHistory, createRouter, RouterView } from "vue-router";
import { useLeaveGuard } from "./useLeaveGuard.js";

async function setup(initialDirty: boolean) {
  const dirty = ref(initialDirty);
  const guard: { current?: ReturnType<typeof useLeaveGuard> } = {};
  const Page = defineComponent({
    setup() {
      guard.current = useLeaveGuard(() => dirty.value);
      return () => h("div");
    },
  });
  const Other = defineComponent({ render: () => h("p") });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/garde-robe", component: Page },
      { path: "/ailleurs", component: Other },
    ],
  });
  await router.push("/garde-robe");
  await router.isReady();
  const wrapper = mount(RouterView, { global: { plugins: [router] } });
  return { dirty, guard, router, wrapper };
}

describe("useLeaveGuard", () => {
  it("laisse partir sans rien demander quand il n'y a rien à perdre", async () => {
    const { router, guard } = await setup(false);
    await router.push("/ailleurs");
    expect(router.currentRoute.value.path).toBe("/ailleurs");
    expect(guard.current?.asking.value).toBe(false);
  });

  it("retient la navigation tant qu'on n'a pas répondu, puis reste", async () => {
    const { router, guard } = await setup(true);
    const going = router.push("/ailleurs");
    await nextTick();
    expect(guard.current?.asking.value).toBe(true);
    expect(router.currentRoute.value.path).toBe("/garde-robe");

    guard.current?.decide(false);
    await going;
    expect(router.currentRoute.value.path).toBe("/garde-robe");
    expect(guard.current?.asking.value).toBe(false);
  });

  it("quitte quand on le confirme", async () => {
    const { router, guard } = await setup(true);
    const going = router.push("/ailleurs");
    await nextTick();
    guard.current?.decide(true);
    await going;
    expect(router.currentRoute.value.path).toBe("/ailleurs");
  });
});

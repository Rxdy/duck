import { describe, expect, it } from "vitest";
import { nextTick, ref } from "vue";
import { PAGE_SIZE, useProgressiveList } from "./useProgressiveList.js";

const numbers = (count: number) => Array.from({ length: count }, (_, i) => i);
const scrolled = (scrollTop: number) =>
  ({ target: { scrollTop, clientHeight: 500, scrollHeight: 2000 } }) as unknown as Event;

describe("useProgressiveList", () => {
  it("ne montre qu'une page, puis la suite en approchant du bas", () => {
    const list = useProgressiveList(ref(numbers(100)), () => "tout");
    expect(list.visible.value).toHaveLength(PAGE_SIZE);

    list.onScroll(scrolled(100));
    expect(list.visible.value).toHaveLength(PAGE_SIZE);
    list.onScroll(scrolled(1400));

    expect(list.visible.value).toHaveLength(PAGE_SIZE * 2);
  });

  it("s'arrête à la fin de la liste", () => {
    const list = useProgressiveList(ref(numbers(40)), () => "tout");
    for (let i = 0; i < 5; i++) list.onScroll(scrolled(1500));

    expect(list.visible.value).toHaveLength(40);
  });

  it("repart du début quand le tri change", async () => {
    const filter = ref("tout");
    const list = useProgressiveList(ref(numbers(100)), () => filter.value);
    list.onScroll(scrolled(1500));

    filter.value = "tete";
    await nextTick();

    expect(list.visible.value).toHaveLength(PAGE_SIZE);
  });
});

import { describe, expect, it } from "vitest";
import { ACCESSOIRES } from "../accessories/accessoires.js";
import { activeEvent, easter, editionFor, EDITIONS, imagePath, layoutFor } from "./calendar.js";
import { DEVICES, PAGES, type Edition } from "./types.js";

// Lu par Vite et non par le système de fichiers : les images sont de simples fichiers de public/.
const images = new Set(Object.keys(import.meta.glob("../../../public/scenes/**/*.jpg")));

const stub = (event: string, year: number): Edition => ({
  id: `${event}-${year}`,
  event,
  year,
  snow: false,
  layouts: [],
});

describe("calendrier des événements", () => {
  it("suit Noël de part et d'autre du nouvel an, avec l'année où il a commencé", () => {
    expect(activeEvent(new Date(2026, 10, 19))).toBeUndefined();
    expect(activeEvent(new Date(2026, 10, 20))).toEqual({ event: "noel", year: 2026 });
    expect(activeEvent(new Date(2026, 11, 31))).toEqual({ event: "noel", year: 2026 });
    expect(activeEvent(new Date(2027, 0, 6))).toEqual({ event: "noel", year: 2026 });
    expect(activeEvent(new Date(2027, 0, 7))).toBeUndefined();
  });

  it("connaît les autres fenêtres, dont Pâques qui se déplace", () => {
    expect(activeEvent(new Date(2026, 6, 14))?.event).toBe("ete");
    expect(activeEvent(new Date(2026, 9, 31))?.event).toBe("halloween");
    expect(activeEvent(new Date(2026, 1, 10))?.event).toBe("saint-valentin");
    // Pâques 2026 : 5 avril ; 2027 : 28 mars.
    expect(easter(2026)).toEqual(new Date(2026, 3, 5));
    expect(easter(2027)).toEqual(new Date(2027, 2, 28));
    expect(activeEvent(new Date(2026, 3, 1))?.event).toBe("paques");
    expect(activeEvent(new Date(2026, 3, 20))).toBeUndefined();
  });

  it("montre l'édition de l'année, ou à défaut la plus récente d'avant", () => {
    const editions = [stub("noel", 2026), stub("noel", 2027)];
    expect(editionFor(new Date(2027, 11, 24), null, editions)?.id).toBe("noel-2027");
    // Début janvier 2028 : encore l'édition de 2027.
    expect(editionFor(new Date(2028, 0, 3), null, editions)?.id).toBe("noel-2027");
    // Noël 2028 sans nouvelles images : on garde celles de 2027.
    expect(editionFor(new Date(2028, 11, 24), null, editions)?.id).toBe("noel-2027");
    // Avant la première édition : rien.
    expect(editionFor(new Date(2025, 11, 24), null, editions)).toBeUndefined();
  });

  it("ne montre rien pour un événement sans édition produite", () => {
    expect(editionFor(new Date(2026, 6, 14), null, [stub("noel", 2026)])).toBeUndefined();
  });

  it("laisse forcer un événement ou une édition, pour les voir hors saison", () => {
    const editions = [stub("noel", 2026), stub("noel", 2027)];
    expect(editionFor(new Date(2026, 5, 1), "noel", editions)?.id).toBe("noel-2026");
    expect(editionFor(new Date(2026, 5, 1), "noel-2027", editions)?.id).toBe("noel-2027");
    expect(editionFor(new Date(2026, 5, 1), "inconnu", editions)).toBeUndefined();
  });
});

describe("éditions produites", () => {
  const slots = new Map(ACCESSOIRES.map((a) => [a.id, a.emplacement]));

  for (const edition of EDITIONS) {
    describe(edition.id, () => {
      it("a une composition pour chaque page et chaque format d'écran", () => {
        for (const page of PAGES) {
          for (const device of DEVICES) {
            expect(layoutFor(edition, page, device), `${page}-${device}`).toBeDefined();
          }
        }
      });

      it("a toutes ses images dans front/public/scenes (sinon : node scripts/render-scenes.mjs)", () => {
        for (const layout of edition.layouts) {
          expect(
            images.has(`../../../public${imagePath(edition, layout)}`),
            imagePath(edition, layout),
          ).toBe(true);
        }
      });

      it("n'habille les canards qu'avec des accessoires du catalogue, une pièce par emplacement", () => {
        for (const layout of edition.layouts) {
          for (const actor of layout.actors) {
            const worn = actor.outfit.map((id) => slots.get(id));
            expect(worn, actor.outfit.join(",")).not.toContain(undefined);
            expect(new Set(worn).size, actor.outfit.join(",")).toBe(worn.length);
          }
        }
      });

      it("varie d'une page à l'autre", () => {
        const positions = (page: "accueil" | "classement") =>
          JSON.stringify(layoutFor(edition, page, "paysage")!.actors.map((a) => [a.x, a.z]));
        expect(positions("accueil")).not.toBe(positions("classement"));
      });
    });
  }

  it("retombe sur les pages ordinaires quand une page n'a pas sa composition", () => {
    const base = EDITIONS[0]!;
    const sparse: Edition = { ...base, layouts: base.layouts.filter((l) => l.page === "defaut") };
    expect(layoutFor(sparse, "accueil", "portrait")?.page).toBe("defaut");
  });
});

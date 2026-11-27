# 13. Scènes de saison (fond des pages)

Le fond des pages change au fil de l'année : une grande image habille tout l'écran derrière le contenu. Hors
événement, le décor classique reste (des canards habillés d'un thème au hasard, sur grand écran).

## Ce qui est choisi, et comment

| Critère | Effet |
|---|---|
| **Événement** | `front/src/lib/scenes/calendar.ts` : Noël (20 nov → 6 janv.), Saint-Valentin, Halloween, Été, Pâques (fenêtre mobile, calculée). |
| **Édition** (l'année) | `noel-2026`, `noel-2027`… Chaque année a ses propres décors et canards. Tant qu'une édition n'existe pas, la plus récente d'avant sert. |
| **Page** | `accueil`, `classement`, `defaut` (toutes les autres). Une page sans composition prend `defaut`. |
| **Format d'écran** | `paysage` ou `portrait`, suivi en direct (on tourne une tablette, l'image change). |

Une image = `front/public/scenes/<édition>/<page>-<format>.jpg`. `?scene=noel` (ou `?scene=noel-2026`) dans l'adresse
force un événement hors saison, pour le voir.

## Produire une édition

1. Copier `front/src/lib/scenes/noel-2026.ts` en `noel-2027.ts` : on y change les *morceaux* (le sapin, le traîneau,
   le Père Noël...), ce qu'ils contiennent et comment chaque page les assemble. Les accessoires viennent du catalogue.
2. L'ajouter à `EDITIONS` dans `calendar.ts`.
3. Fabriquer les images : `(cd front && npx vite --port 5180)`, puis `node scripts/render-scenes.mjs noel-2027`
   (`npm i --no-save playwright-core` et un Chromium la première fois). Les images sont commitées.
4. Un test échoue si une image manque, si un accessoire n'existe plus ou si une page/format n'a pas de composition.

Pour un nouvel événement : l'ajouter à `EVENTS` (fenêtre) et produire sa première édition. Sans édition, il n'habille rien.

## État

Seule **Noël 2026** est produite. Saint-Valentin, Halloween, Été et Pâques sont dans le calendrier mais sans images.

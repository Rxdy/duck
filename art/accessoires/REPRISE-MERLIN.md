# Reprise sur merlin

Cette note complète `docs/reprise/REPRISE.md` (branche `fix/responsive`), écrite avant les thèmes.

## Le jeu

```bash
git clone https://github.com/Rxdy/duck.git && cd duck
git switch fix/responsive
make install && make dev     # Node 22 et Docker ; http://localhost:5173
```

## Les accessoires (branche à part)

```bash
git switch art/accessoires
(cd front && npm install && npx vite --port 5180)      # atelier : http://localhost:5180/atelier/?a=kabuto,armure-laquee&v=dos
npm i --no-save playwright && npx playwright install chromium   # seulement pour refaire les planches
node art/accessoires/rendre.mjs                                  # LOT=lot2 pour une seule planche
```

## Où on en est

- 213 accessoires à gagner (+ 5 réservés à Coincoin), 5 emplacements, 70 thèmes sur 90 (`THEMES.md`).
- Règle : une tenue couvrante garde largement la couleur du joueur (`"peau"`, `"peau-sombre"`) ; contrôle avec
  `planche-couleur-joueur.png`.
- Casques fermés : le panneau `fenetre` doit rester à z = 0,262 pour ne pas cacher le blanc des yeux.
- Lots 3, 4 et 5 produits (`planche-lot3.png` à `planche-lot5.png`), à valider.
- À retoucher : couleur du joueur sur samouraï, rockeur et pharaon ; poêle du cuisinier ; ailes du diablotin. Les 18
  premiers thèmes n'ont pas encore été contrôlés sur la couleur.
- L'issue « Accessoires » de `docs/reprise/issues.py` cite encore les chiffres du premier lot (27 accessoires).

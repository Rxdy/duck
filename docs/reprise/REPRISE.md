# Reprendre le travail (état au 26/11/2026)

## Sur un autre poste

```bash
git clone https://github.com/Rxdy/duck.git && cd duck
git switch fix/responsive
make install && make dev     # Node 22 et Docker requis ; jeu sur http://localhost:5173
make check                   # tout ce que vérifie la CI
```

La base locale (comptes, cartes, classement) ne voyage pas avec Git : elle repart de zéro.

## Branches

| Branche | Contenu |
|---|---|
| `feature/notes-graphismes` | Coincoin fluo intégré, plus `dev` fusionné |
| `fix/responsive` | Tout le travail suivant (part de la précédente) : à continuer, puis PR vers `dev` |
| `art/accessoires` | Atelier des accessoires, à part du jeu (voir `art/accessoires/README.md` sur cette branche) |

games-hub : `main` est à jour ; l'ancien travail local est gardé sur `sauvegarde/ancien-front`.

## Fait sur `fix/responsive`

Direction « Ardoise » (gris, un seul bleu, seuls les canards brillent ; ni thème clair ni canard mat), mises en page
téléphone et paysage, boutons tactiles ou zones autour du canard, pivot contre les murs, gros plan fixe avec décompte et
mini-carte, recherche de partie en arrière-plan, FFA 3 retiré, classement, page Jouer, options en sections, tutoriel et
mode libre, éditeur (tracé des murs), mot de passe jugé sur 60 bits, pseudo et email uniques, connexion Google (à
configurer), favicon, icônes et bannière de partage.

## Préférences retenues

- Les pages tiennent à l'écran sans défiler, sur tous les appareils.
- Interface sobre : pas de néon ni de halos, sauf une lueur légère sur les canards (jamais sous le socle).
- Des propositions visuelles d'abord (canevas), l'intégration après validation.

## À faire

Voir les issues GitHub. Leur texte est aussi dans `docs/reprise/issues.py` (`--creer` les publie avec `gh`).
Règles des nouveaux modes : `docs/11-nouveaux-modes.md`.

Maquettes (privées, compte Claude) : https://claude.ai/artifact/VHGXtt3TFrbSZ4GSHEWvfy

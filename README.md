# Duck

Jeu multijoueur en ligne sur grille, inspiré des mini-jeux créés avec les Wired de Habbo Hotel. Les
joueurs contrôlent un canard sur un plateau et doivent atteindre la base adverse pour marquer des
points.

Documentation complète : [`docs/`](docs/README.md).

## Structure du projet

Trois dossiers indépendants à la racine, un par conteneur — pas de monorepo npm workspaces : chacun
a son propre `package.json`, son propre `node_modules`, sa propre CI.

```
front/       React + Vite + Three.js (React Three Fiber) — voir front/README.md
back/        Serveur WebSocket autoritaire (Node.js) — contient aussi le moteur de jeu, le
             protocole WebSocket, la génération de cartes et l'éditeur (voir back/src/)
db/          PostgreSQL (comptes, progression, classement) — pas de code, voir db/README.md
art/         Sources graphiques (les 8 orientations du canard), déclinées dans chaque couleur
             de joueur par scripts/generate-duck-sprites.py — voir docs/03-rendu-3d.md
```

Le client (`front/`) ne partage aucun code TypeScript avec le serveur : il ne connaît que le
protocole WebSocket (types dupliqués localement dans `front/src/types.ts`).

## Démarrer en local

Prérequis : Node.js 22+ et Docker (pour PostgreSQL).

```bash
make install   # dépendances de front/ et back/, hooks Git, .env
make dev       # Postgres + serveur :8080 + client :5173, Ctrl+C arrête tout
make help      # toutes les cibles disponibles
```

Le `Makefile` n'est qu'un raccourci : les commandes npm restent utilisables telles quelles.

```bash
cd back && npm install && npm run dev    # serveur WebSocket sur :8080
cd front && npm install && npm run dev   # client Vite sur :5173
```

Ou toute la pile en conteneurs (`make up`, démarre aussi PostgreSQL) :

```bash
docker compose up --build
```

## Scripts (identiques dans `front/` et `back/`)

| Commande | Rôle |
|---|---|
| `npm run lint` | ESLint |
| `npm run format` | Vérifie le formatage Prettier |
| `npm run typecheck` | Vérification TypeScript |
| `npm test` | Tests unitaires (Vitest) — `back/` uniquement pour l'instant |
| `npm run build` | Build de prod — `front/` uniquement pour l'instant |

`make lint`, `make format`, `make typecheck`, `make test` et `make build` les lancent sur les deux
dossiers d'un coup ; `make check` enchaîne les cinq, comme la CI.

## Workflow Git

- `main` : code déployé en production. Protégée, pas de push ni de commit direct.
- `dev` : intégration continue avant release. Protégée, pas de push ni de commit direct.
- `feature/*` : toute nouvelle fonctionnalité ou correction se fait sur une branche dédiée, fusionnée
  dans `dev` via pull request (revue + CI verte obligatoires).

Un hook Git local (`scripts/git-hooks/`) bloque déjà les commits/push directs sur `main` et `dev` ;
les règles de protection GitHub côté serveur sont la garantie principale.

## CI

Chaque push et pull request sur `main`/`dev` déclenche `.github/workflows/ci.yml` : lint, format,
typecheck, tests et build, exécutés séparément pour `front/` et `back/`.

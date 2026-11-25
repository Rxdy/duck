# Duck

Jeu multijoueur en ligne sur grille, inspiré des mini-jeux créés avec les Wired de Habbo Hotel. Les
joueurs contrôlent un canard sur un plateau et doivent atteindre la base adverse pour marquer des
points.

Documentation complète : [`docs/`](docs/README.md).

## Structure du projet

Trois dossiers indépendants à la racine, un par conteneur — pas de monorepo npm workspaces : chacun
a son propre `package.json`, son propre `node_modules`, sa propre CI.

```
front/       Vue 3 + Vite + Three.js — voir front/README.md
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

## CI/CD et releases

| Événement | Workflow | Ce qui se passe |
|---|---|---|
| Pull request vers `main` / `dev`, push sur `dev` | [`ci.yml`](.github/workflows/ci.yml) | Lint, format, typecheck, tests et build (`front/` et `back/`), puis les **vraies images** (nginx, serveur, Postgres) avec de vraies requêtes : [`scripts/tester-images.sh`](scripts/tester-images.sh) |
| Fusion dans `main` | [`images.yml`](.github/workflows/images.yml) | La CI, puis les images `ghcr.io/rxdy/duck-front` et `duck-back` (`amd64` + `arm64`) en `latest`. Watchtower les déploie sur le Pi (vérification toutes les 5 minutes). |
| Tag `vX.Y.Z` | [`release.yml`](.github/workflows/release.yml) | Les images de ce commit reçoivent le tag de version (jamais reconstruites) et une release GitHub est créée |

```bash
make release V=1.0.0     # tag v1.0.0 sur main ; la CI fait le reste
make test-images         # teste en local ce que teste la CI sur les images
```

`make release` refuse si on n'est pas sur `main`, si des modifications ne sont pas commitées, si `main` n'est pas
identique à `origin/main`, ou si le tag existe déjà.

## Mise en ligne (Raspberry Pi, Traefik)

Un seul domaine, `https://duck.rxdy.fr` : Traefik envoie `/api/*` et `/ws` (WebSocket) au serveur, en retirant le
préfixe, et le reste au front. Le front calcule ses adresses à partir du domaine
([`front/src/lib/serverUrl.ts`](front/src/lib/serverUrl.ts)) : une seule image sert partout, sans variable au build.

Sur le Pi, il suffit de [`docker-compose.prod.yml`](docker-compose.prod.yml) et d'un `.env` :

```bash
mkdir -p ~/duck && cd ~/duck
# docker-compose.prod.yml et .env.example copiés depuis le dépôt
cp .env.example .env     # puis : POSTGRES_PASSWORD=$(openssl rand -base64 24 | tr -d '=+/')
docker compose -f docker-compose.prod.yml up -d
```

- Le schéma de la base est appliqué par le serveur à chaque démarrage ([`back/src/migrate.ts`](back/src/migrate.ts)) :
  une mise à jour apporte ses migrations toute seule.
- PostgreSQL n'est pas exposé : seul le serveur du jeu lui parle. Les données sont dans le volume `duck_db`.
- `ALLOWED_ORIGINS` (par défaut `https://duck.rxdy.fr`) limite le CORS et les connexions WebSocket au site.

## Licence

[MIT](LICENSE)

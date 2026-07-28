# Duck

Jeu multijoueur en ligne sur grille, inspiré des mini-jeux créés avec les Wired de Habbo Hotel. Les
joueurs contrôlent un canard sur un plateau et doivent atteindre la base adverse pour marquer des
points.

Documentation complète : [`docs/`](docs/README.md).

## Structure du monorepo

```
apps/
  client/          React + Vite + Three.js (React Three Fiber)
  server/          Serveur WebSocket autoritaire (Node.js)

packages/
  shared/          Types partagés
  protocol/        Types des messages WebSocket client <-> serveur
  game-engine/     Règles du jeu (déplacement, collisions, scores) — indépendant du rendu/réseau
  map-generator/   Génération procédurale de cartes
  editor/          Logique de l'éditeur de cartes (pure, sans UI)
```

## Démarrer en local

Prérequis : Node.js 22+.

```bash
npm install
npm run dev:server   # serveur WebSocket sur :8080
npm run dev:client   # client Vite sur :5173
```

Ou via Docker Compose :

```bash
docker compose up --build
```

## Scripts

| Commande | Rôle |
|---|---|
| `npm run lint` | ESLint sur tout le monorepo |
| `npm run format` | Vérifie le formatage Prettier |
| `npm run typecheck` | Vérification TypeScript de tous les packages |
| `npm test` | Tests unitaires (Vitest) de tous les packages |
| `npm run build` | Build de tous les packages/apps |

## Workflow Git

- `main` : code déployé en production. Protégée, pas de push ni de commit direct.
- `dev` : intégration continue avant release. Protégée, pas de push ni de commit direct.
- `feature/*` : toute nouvelle fonctionnalité ou correction se fait sur une branche dédiée, fusionnée
  dans `dev` via pull request (revue + CI verte obligatoires).

Un hook Git local (`scripts/git-hooks/`) bloque déjà les commits/push directs sur `main` et `dev` ;
les règles de protection GitHub côté serveur sont la garantie principale.

## CI

Chaque push et pull request sur `main`/`dev` déclenche `.github/workflows/ci.yml` : lint, format,
typecheck, tests et build.

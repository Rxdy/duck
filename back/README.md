# back

Serveur WebSocket autoritaire (Node.js). Projet npm indépendant — pas de dépendance vers `front/`.

Contient aussi, en interne (anciennement des packages séparés du monorepo) :

- `src/protocol.ts` — types des messages WebSocket client <-> serveur
- `src/shared.ts` — types communs, constantes (couleurs joueurs...)
- `src/game-engine/` — règles du jeu (déplacement, collisions, scores), indépendant du réseau/rendu
- `src/map-generator/` — génération procédurale de cartes
- `src/editor/` — logique de l'éditeur de cartes (pure, sans UI)

```bash
npm install
npm run dev       # :8080, avec rechargement
npm run start     # sans rechargement (utilisé en prod, voir Dockerfile)
npm run lint
npm run format
npm run typecheck
npm test
```

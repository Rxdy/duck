# front

Client web (React + Vite + Three.js / React Three Fiber). Projet npm indépendant — pas de dépendance vers `back/`.

Ne partage aucun type avec le serveur : les types des messages WebSocket sont définis localement dans `src/types.ts` et doivent être gardés manuellement synchronisés avec `back/src/protocol.ts`.

```bash
npm install
npm run dev       # :5173
npm run build     # build de prod dans dist/
npm run lint
npm run format
npm run typecheck
```

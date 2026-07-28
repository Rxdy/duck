# 6. Architecture technique

## Stack

### Front

- React
- TypeScript
- Vite
- Three.js (via React Three Fiber) — voir [rendu 3D](03-rendu-3d.md)
- Zustand
- Tailwind

### Back

- Node.js **ou** Bun
- Communication : **WebSocket**
- Base de données : **PostgreSQL**

### Authentification

Google, Discord, GitHub (voir [comptes & progression](05-comptes-progression.md)), optionnellement email.

## Principe : serveur autoritaire

Schéma de communication :

```
                 WebSocket
        ┌──────────────────────┐
        │       Serveur        │
        │  Node.js / Bun       │
        └──────────────────────┘
           ↑              ↑
      Joueur A       Joueur B
           ↑              ↑
        React / Three.js
```

Le serveur est 100 % autoritaire :

- il possède l'état de la partie
- il valide tous les déplacements
- il calcule les collisions
- il attribue les points
- il renvoie le nouvel état à tous les joueurs

Ainsi, impossible de tricher en modifiant le client — le client ne décide jamais de sa position.

### Flux d'un déplacement

Le client envoie uniquement une intention :

```json
{ "type": "move", "direction": "UP" }
```

Le serveur applique la logique :

```
Direction reçue → position actuelle → case libre ? → oui → déplacement → broadcast
```

Exemple : le serveur connaît `P1` en `(5,6)`, reçoit `UP`, calcule `(5,5)`, puis diffuse :

```json
{
  "type": "state",
  "players": [
    { "id": 1, "x": 5, "y": 5 }
  ]
}
```

## Modèle de données (esquisse)

```ts
Game {
  id
  map
  players[]
  scores[]
  obstacles[]
  spawnPoints[]
  goals[]
}

Player {
  id
  name
  color
  x
  y
  spawnX
  spawnY
  score
}

enum Tile {
  Empty,
  Wall,
  Spawn,
  Goal,
  Water,
  Bonus
  // + Lava, Ice, Bridge, Conveyor, Teleporter, Trap, Decor (voir gameplay)
}
```

## Protocole WebSocket

Types de messages :

| Message | Rôle |
|---|---|
| `JOIN` | Connexion à une partie/salle |
| `MOVE` | Le client envoie une direction |
| `STATE` | Le serveur diffuse le nouvel état |
| `SCORE` | Mise à jour du score |
| `END` | Fin de partie |
| `PING` | Maintien de connexion |

## Architecture du projet (monorepo)

```
apps/
    client/
    server/

packages/
    protocol/
    game-engine/
    map-generator/
    editor/
    shared/
```

Le **game-engine** ne connaît ni React ni les WebSockets. Il contient uniquement les règles du jeu :

- déplacement
- collisions
- génération de cartes
- scores
- conditions de victoire

Le serveur importe ce moteur pour faire tourner les parties, le client ne fait qu'afficher l'état reçu. Cette séparation :

- facilite les tests (le moteur est testable en isolation)
- permet d'ajouter des modes de jeu sans toucher au réseau ou au rendu
- garantit que les règles restent identiques partout (serveur, tests, bots — voir [idées futures](09-idees-futures.md))

Le moteur du jeu peut ainsi fonctionner : sur le serveur, en local, dans les tests.

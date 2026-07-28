# 8. Roadmap

| Version | Contenu |
|---|---|
| **0.1** | Déplacement, WebSocket, grille, collisions |
| **0.2** | Score, matchmaking, parties privées |
| **0.3** | Génération procédurale |
| **0.4** | Éditeur de cartes |
| **0.5** | Publication des cartes |
| **1.0** | Classement, profils, succès, skins, saisons |

Cette roadmap correspond au cœur du produit. Les fonctionnalités listées dans [idées futures](09-idees-futures.md) (replay, bots, clans, éditeur de logique, tournois...) et le [multiplateforme/devops](07-devops-multiplateforme.md) viennent s'ajouter en parallèle ou après la V1, selon les priorités.

## Point de départ suggéré

Commencer par `packages/game-engine` (voir [architecture technique](06-architecture-technique.md#architecture-du-projet)) : c'est la brique la plus indépendante, testable sans serveur ni rendu, et tout le reste (serveur autoritaire, client, bots, replay) en dépend.

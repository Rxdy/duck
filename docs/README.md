# Duck — Documentation du projet

Jeu multijoueur en ligne sur grille, inspiré des mini-jeux créés avec les Wired de Habbo Hotel. Les joueurs contrôlent un canard sur un plateau et doivent atteindre la base adverse pour marquer des points.

Domaine visé : `duck.mondomaine.fr`

Ce dossier découpe le cahier des charges initial (voir [`../resultat.md`](../resultat.md) pour la conversation source brute) en fichiers thématiques, plus faciles à faire évoluer un par un.

## Sommaire

1. [Vision & présentation](01-vision.md) — pitch, objectifs, philosophie long terme
2. [Gameplay](02-gameplay.md) — déplacement, plateau, modes de jeu, matchmaking
3. [Rendu graphique 3D](03-rendu-3d.md) — vue isométrique, style low poly
4. [Générateur & éditeur de cartes](04-editeur-cartes.md) — génération procédurale, éditeur, mode test, publication
5. [Comptes & progression](05-comptes-progression.md) — auth, XP, personnalisation, classement
6. [Architecture technique](06-architecture-technique.md) — stack, monorepo, protocole WebSocket
7. [Multiplateforme & DevOps](07-devops-multiplateforme.md) — responsive, CI/CD, Docker
8. [Roadmap](08-roadmap.md) — versions 0.1 → 1.0
9. [Idées futures](09-idees-futures.md) — replay, bots, clans, workshop, événements...

## Statut

Squelette du monorepo en place (`apps/client`, `apps/server`, `packages/shared`, `packages/protocol`, `packages/game-engine`, `packages/map-generator`, `packages/editor`), avec CI, lint, tests et Docker. Prochaine étape : continuer l'implémentation en suivant la [roadmap](08-roadmap.md).

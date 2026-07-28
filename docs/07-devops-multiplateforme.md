# 7. Multiplateforme & DevOps

## Plateformes cibles

- PC fixe
- Ordinateur portable
- Mac
- iPad / tablettes Android
- iPhone / Android

Conséquences techniques :

- Interface **responsive**
- Commandes **clavier** (desktop) et **tactiles** (joystick virtuel ou boutons directionnels) sur mobile/tablette

## Développement

- **Monorepo GitHub**
- **Docker** / Docker Compose pour l'environnement de dev et le déploiement
- **GitHub Actions** pour la CI/CD
- Lint automatique
- Tests unitaires
- Tests E2E
- Déploiement automatique
- Variables d'environnement documentées
- Documentation du projet
- Convention Git : `main` / `develop` / `feature/*`

## Infrastructure de déploiement

- Front : React + TypeScript + Vite
- Rendu : React Three Fiber (Three.js)
- Back : Node.js ou Bun
- Base : PostgreSQL
- Communication : WebSocket
- Reverse proxy : Nginx ou Traefik
- Déploiement via Docker, sur le sous-domaine `duckduck.mondomaine.fr`

## Outils intégrés au produit

- Générateur procédural de cartes
- Éditeur de cartes
- Mode test
- Mode spectateur
- Matchmaking
- Parties privées
- Replays
- Bots IA

(Détails de chaque outil dans les fichiers dédiés : [gameplay](02-gameplay.md), [éditeur de cartes](04-editeur-cartes.md), [idées futures](09-idees-futures.md).)

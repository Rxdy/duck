# 1. Vision & présentation

## Nom du projet

**Duck**

## Domaine

`duck.mondomaine.fr`

## Pitch

Duck est un jeu multijoueur en ligne inspiré des mini-jeux créés avec les Wired de Habbo Hotel. Les joueurs contrôlent un canard sur un plateau composé de cases. Le but est de rejoindre la base adverse pour marquer des points, tout en empêchant les autres joueurs d'atteindre la sienne.

Le jeu doit être **rapide**, **simple à prendre en main** et **très compétitif**. Les parties durent généralement entre 2 et 5 minutes.

## Objectifs

Créer une plateforme web permettant de :

- jouer en ligne
- créer des cartes
- tester des cartes
- jouer avec ses amis
- profiter d'un matchmaking automatique
- consulter un classement
- faire évoluer le contenu via la communauté

Le jeu doit être pensé comme un **jeu-service** pouvant évoluer pendant plusieurs années, pas comme un projet fini une fois la V1 livrée.

## Vision à long terme

L'objectif n'est pas de reproduire Habbo, mais de reprendre l'idée qui rendait ses mini-jeux si addictifs : des règles simples, une infinité de cartes, et une forte créativité de la communauté.

À terme, Duck pourrait devenir une véritable **plateforme de jeux sur grille** où les joueurs créent, partagent et jouent à des cartes originales.

Une évolution naturelle serait d'ajouter un **éditeur de logique** inspiré des Wired de Habbo (nom de travail : *Duck Logic*) : des blocs visuels (déclencheurs, conditions, actions) permettant de créer de nouveaux modes de jeu sans écrire de code. Cela transformerait Duck en un « sandbox » où la communauté invente ses propres règles, événements et mini-jeux, tout en conservant une base technique moderne (WebSocket, moteur de jeu serveur autoritaire, rendu 3D isométrique, éditeur intégré).

## Principes directeurs

- **Le serveur est toujours autoritaire** — le client ne décide jamais du résultat d'une action, il ne fait qu'afficher l'état reçu. Impossible de tricher en modifiant le client.
- **Le moteur de jeu est indépendant** du rendu et du réseau, pour rester testable et réutilisable (serveur, local, tests, bots).
- **Récompenses purement cosmétiques** — pas de pay-to-win, y compris si une économie est introduite plus tard.
- Penser les fondations (replay, bots, spectateur, API) dès le début pour éviter une refonte d'architecture par la suite.

# 9. Idées futures

Fonctionnalités qui ne sont pas indispensables pour une V1, mais à garder en tête dès la conception de l'architecture pour éviter une refonte plus tard.

## Fondations techniques à prévoir tôt

- **Système de replay** : enregistrer les actions plutôt qu'une vidéo (léger, permet de rejouer une partie, déboguer des cartes, partager des matchs). Fonctionne naturellement bien avec un [moteur de jeu déterministe et serveur autoritaire](06-architecture-technique.md#principe--serveur-autoritaire).
- **Bots** utilisant exactement le même protocole WebSocket que les joueurs, pour remplir une partie ou tester une carte automatiquement.
- **Mode spectateur** pour regarder des parties en direct.
- **API publique** pour que la communauté crée des statistiques, overlays ou outils tiers, et pour partager facilement des cartes.

## Contenu

- Cartes à thèmes (forêt, désert, neige, volcan, cyberpunk) sans changer la logique du jeu.
- Saisons avec récompenses cosmétiques (skins de canards, socles, traînées, emotes).
- Skins rares obtenus uniquement via succès ou événements.
- Système d'événements temporaires (Halloween, Noël, Été...) avec cartes et récompenses dédiées.

## Communauté & compétition

- **Duck Logic** : éditeur de logique inspiré des Wired de Habbo — blocs visuels (déclencheurs, conditions, actions) pour créer de nouveaux modes de jeu sans coder. C'est l'idée qui peut le plus démarquer Duck (voir [vision](01-vision.md#vision-à-long-terme)).
- Workshop communautaire : publier, noter, télécharger des cartes.
- Rotation hebdomadaire des cartes les plus populaires.
- Classement des créateurs, en plus du classement des joueurs.
- Éditeur de skins, si la création est ouverte à la communauté.
- Tournois automatiques chaque week-end.
- Parties personnalisées (temps, score, vitesse, obstacles, règles).
- Système de clans/guildes.

## Monétisation (si envisagée un jour)

Économie **purement cosmétique** (skins, animations, emotes) — jamais d'avantage en jeu. Cohérent avec le principe posé dans la [vision](01-vision.md#principes-directeurs).

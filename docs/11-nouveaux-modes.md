# Nouveaux modes de jeu

Rien de ce document n'est codé. Les points marqués **« à confirmer »** sont des propositions, pas des décisions.

## Règles communes (celles du jeu actuel)

- Plateau en grille ; un appui = une case ; un mur bloque mais le canard se tourne quand même.
- Entrer sur la case d'un adversaire le **touche** : il retourne à son départ.
- Après un retour au départ : **1,5 s d'immunité**, pendant laquelle on ne peut ni toucher ni être touché.
- Décompte de 3 secondes au départ ; les places libres sont complétées par des bots.
- Le serveur seul fait foi. Chaque mode demande aux bots d'apprendre son objectif.

## 2v2 (à faire en premier : les autres modes réutilisent les équipes)

- 4 joueurs, 2 équipes de 2, sur les cartes à 4 bases.
- **Un score par équipe.** On marque en entrant sur une base de l'équipe adverse : +3, retour à son départ.
- **Coéquipiers :** on ne se touche pas entre alliés ; un allié bloque le passage comme un mur *(à confirmer : ou se
  traverse)*.
- Toucher un adversaire vole 1 point à son équipe (jamais sous zéro).
- La première équipe à **15 points** gagne *(à confirmer)*.
- Équipes : les deux bases d'une même équipe sont voisines *(à confirmer : voisines ou en diagonale)*. Chaque équipe a
  deux nuances d'une même famille de couleurs, ou un repère distinct des couleurs actuelles *(à confirmer)*.

## Conquête (colorier les cases)

- Duel, FFA 4 ou 2v2. Manche de **3 minutes** *(à confirmer)*. Aucun point à marquer sur les bases.
- **Il faut passer 3 fois sur une case pour qu'elle prenne sa couleur.** Un passage est compté à chaque *entrée* sur la
  case ; rester dessus ne compte pas.
- La progression (1 sur 3, 2 sur 3) doit être visible sur la case.
- **Remise à zéro** *(interprétation à confirmer)* : si une case n'est qu'à 1 ou 2 passages et qu'un autre joueur (autre
  équipe en 2v2) y entre, la progression précédente disparaît et la sienne commence à 1. Il n'y a pas de remise à zéro
  avec le temps.
- **Reprise d'une case déjà colorée** *(à confirmer)* : le premier passage adverse retire la couleur et vaut 1 sur 3.
- Les allers-retours entre deux cases sont autorisés *(à confirmer)*.
- Les murs et les cases de départ ne se colorent pas. En 2v2, les passages des deux coéquipiers s'additionnent.
- Toucher un adversaire le renvoie à son départ ; les cases ne changent pas.
- Fin du temps : **le plus de cases colorées gagne**. Égalité : prolongation, la première case prise l'emporte *(à
  confirmer)*.

## Roi de la colline *(règles proposées, à confirmer)*

- Duel, FFA 4 ou 2v2. Une zone de 3×3 cases au centre de la carte.
- Chaque seconde pleine où **un seul** joueur (ou une seule équipe) occupe la zone lui donne 1 point.
- Zone vide ou disputée : personne ne marque.
- Toucher un adversaire le renvoie à son départ : c'est le moyen de le déloger.
- Le premier à **30 points** gagne.
- Demande des cartes avec une zone centrale accessible équitablement depuis chaque départ.

## Capture du drapeau *(règles proposées, à confirmer)*

- 2v2 d'abord, duel possible. Chaque équipe a un drapeau posé sur sa base.
- Entrer sur la case du drapeau adverse le ramasse ; le porteur est signalé visiblement.
- Le rapporter sur sa propre base marque **1 capture**, seulement si son propre drapeau y est.
- Porteur touché : il retourne à son départ et le drapeau **tombe sur la case**. Un adversaire du porteur qui y entre le
  renvoie aussitôt à sa base ; un coéquipier du porteur peut le reprendre. Non repris au bout de 10 s, il retourne à sa
  base.
- La première équipe à **3 captures** gagne.

## Équilibrage du toucher (à trancher avant ces modes)

**Aujourd'hui** (`back/src/game-engine/game.ts`) : celui qui **entre** sur la case de l'autre gagne ; le serveur
applique les ordres dans leur ordre d'arrivée. Ni orientation ni égalité.

**Pourquoi c'est frustrant** — deux canards voisins : le premier ordre arrivé gagne, c'est une pure course.

- Celui qui vient se placer au contact offre le premier coup à l'autre.
- Le joueur voit l'adversaire avec le retard du réseau, plus 130 ms de glissade : il croit être le premier.
- Les bots n'ont pas de réseau et jouent toutes les 500 à 120 ms selon leur niveau.

**Pistes**

1. **Pas de toucher de face** *(recommandé)* : on ne mange que par le côté ou par derrière. Face à face, les deux se
   bloquent. L'orientation est déjà connue du serveur (`facing`). Le placement compte plus que la vitesse.
2. **Chacun maître chez soi** : on ne mange un adversaire que sur son propre territoire (déjà teinté). Très lisible,
   mais il faut une règle pour la zone neutre.
3. **Temps d'armement** : impossible de toucher pendant un court instant après avoir bougé. Réduit la course, mais reste
   invisible pour le joueur.

À essayer dans le mode libre du camp d'entraînement avant de changer la règle en partie. Les bots et le tutoriel
(`front/src/lib/tutorial.ts`) devront suivre.

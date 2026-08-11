# 2. Gameplay

## Principe

Chaque joueur contrôle un canard sur un plateau en grille.

Déplacements possibles : **Haut / Bas / Gauche / Droite**.

- Une seule case est parcourue par action.
- Le déplacement est instantané côté règles, mais animé côté rendu.
- Les joueurs ne déplacent jamais eux-mêmes leur canard « librement » : ils envoient une intention de direction, le serveur valide et exécute (voir [architecture technique](06-architecture-technique.md#protocole-websocket)).

## Rythme de déplacement

**Aucun plafond de vitesse.** Marteler la touche est un skill assumé : bien connaître une carte et enchaîner vite doit payer. Le jeu ne cadence donc pas les déplacements, c'est la main du joueur qui le fait.

Deux garde-fous, qui ne brident pas le joueur :

- **Une touche maintenue ne vaut qu'un déplacement.** L'auto-repeat du système émet ~25-30 `keydown`/s, bien au-delà de ce qu'un humain martèle (~10-14/s) : le compter reviendrait à récompenser le joueur qui ne fait rien plus que celui qui joue vite. Le client ignore donc les événements `repeat` (voir `front/src/composables/useKeyboardControls.ts`).
- **Un plancher serveur de 50 ms** (20 actions/s), au-dessus de la vitesse humaine, pour écarter un client scripté (voir `back/src/room.ts`). C'est une protection anti-triche, jamais une règle de jeu.

Les vrais ralentissements viennent (viendront) des **cases à effet** : le sable relève cet intervalle minimum pour le joueur qui s'y trouve — c'est là, et seulement là, que spammer ne sert plus à rien.

## Marquer des points

| Action | Effet |
|---|---|
| Atteindre une base adverse | **+3** pour soi, puis retour à son spawn |
| Toucher un adversaire | **+1 pour soi, −1 pour lui** : un vol |

**Premier à 15 points**, soit cinq bases atteintes — les vols texturent la course, ils ne la remplacent pas.

Les deux barèmes sont volontairement inégaux : la base rapporte trois fois plus qu'un vol, parce que c'est l'objectif du jeu. Sans cet écart, la partie dégénérerait en chasse à l'homme au milieu du terrain, base ignorée.

Le vol est **plafonné par ce que la victime possède** : personne ne descend sous zéro (une spirale négative décourage plus qu'elle ne punit), et s'acharner sur un joueur à zéro ne rapporte rien — il faut aller marquer.

## Toucher un adversaire

Entrer sur la case occupée par un adversaire le **renvoie à son spawn** et lui **vole un point**. C'est la seule interaction directe entre joueurs, et elle crée le rôle de défenseur : intercepter celui qui vient marquer lui coûte du temps de trajet *et* un point, pour un écart de 2 points au classement.

### L'invincibilité au respawn

Réapparaître rend **intouchable pendant 1,5 seconde**, après avoir été touché comme après avoir marqué. Ça règle le spawn kill par construction : personne ne peut être cueilli sur place au moment où il revient.

Deux propriétés à ne pas perdre de vue :

- **Elle est purement défensive** : un joueur immunisé ne peut pas toucher non plus. Sinon réapparaître serait une arme gratuite contre celui qui attend devant la base, en boucle.
- **Elle est temporaire, pas territoriale.** Une zone de sécurité permanente autour de chaque base créerait le problème inverse — un défenseur invincible camperait sa propre base et personne ne pourrait plus marquer. Une durée ne dépend en plus pas de la taille de la carte, contrairement à un rayon.

### Pourquoi camper ne marche pas

Mener 1-0 puis se planter sur sa base pour la défendre ne protège **rien** : entrer sur une base adverse marque, qu'elle soit occupée ou non. L'attaquant renvoie le campeur (chez lui, donc au même endroit — il ne perd rien) **et** marque dans le même mouvement.

Le seul moment où se tenir sur sa base protège vraiment, c'est la seconde et demie d'immunité qui suit son propre point. Après, la base redevient prenable. Camper ne fait donc que ralentir la partie, jamais la verrouiller — et comme il faut 5 points pour gagner, le campeur qui n'attaque plus ne gagne jamais.

Un joueur immunisé fait **mur** : on ne le traverse pas, on ne le renvoie pas. Et il clignote discrètement (voir `front/src/components/organisms/DuckSprite.vue`) — sans ce signal, les deux joueurs lisent mal l'échange et la mécanique passe pour un bug.

## Les bots

Tant qu'une partie n'est pas remplie par de vrais joueurs, les places libres sont tenues par des bots. Leur force repose sur **deux leviers, jamais un troisième** :

| Niveau | Cadence | Vue | Décision | Elo de départ |
|---|---|---|---|---|
| Débutant | 500 ms (2,0 pas/s) | 6 cases | contourne ce qu'il voit, hésite parfois | 200 |
| Intermédiaire | 400 ms (2,3 pas/s) | 8 cases | contourne ce qu'il voit, sans hésiter | 600 |
| Confirmé | 220 ms (4,5 pas/s) | toute la carte | calcule le vrai chemin, quel que soit le détour | 1000 |
| Expert | 160 ms (6,3 pas/s) | toute la carte | chemin calculé + rentre défendre sa base | 1400 |
| Impossible | 120 ms (8,2 pas/s) | toute la carte | idem, mais gagne tous les face-à-face | 1800 |

**Aucun bot ne dépasse la vitesse d'un humain.** Même l'expert reste sous les 10-14 actions/s d'un joueur qui martèle la touche. Un adversaire plus rapide qu'un humain ne se lit pas comme fort, il se lit comme un tricheur — et perdre contre plus rapide que soi n'apprend rien sur son propre niveau, ce qui ruinerait le classement à venir.

La différence entre les niveaux se joue donc surtout sur la **décision** — mais tous **veulent gagner** : même le débutant vise la base adverse, un adversaire qui erre au hasard n'est pas un débutant, c'est un décor. Ce qui monte d'un niveau à l'autre, c'est la **portée de vue**. Tous calculent un vrai chemin, mais les faibles ne le calculent que dans le rayon qu'ils voient : un mur devant eux se contourne, un grand détour les piège. Les deux derniers voient toute la carte, et l'expert renonce à son propre point pour intercepter quand l'adversaire menace sa base de plus près que lui.

**« Impossible » est un mur, pas un palier.** Toucher un adversaire se décide à **celui qui bouge le premier** (voir `canTag`) : à 120 ms, le bot tique plus vite qu'un humain ne réagit (~200 ms) et rafle donc l'échange chaque fois qu'on se croise, même quand on croyait avoir le dessus. Ce n'est pas un bug de collision, c'est la cadence — et c'est pour ça que ce niveau porte ce nom plutôt que d'être le sommet normal de la progression. L'expert, à 160 ms, laisse une vraie chance en face-à-face.

**Un bot faible se perd, il n'est jamais absent.** Un adversaire coincé contre un mur ne rend pas la partie facile, il la rend vide — et sans personne pour marquer, elle ne se termine jamais. Mesurés sur les cartes officielles 1v1 par `back/src/bots.bench.ts`, tous les niveaux atteignent la base adverse à **tous** les coups ; ce qui change, c'est le temps qu'ils y mettent : **12 s, 8 s, 4,4 s, 3,2 s et 2,4 s** par point marqué (médianes), du débutant à « impossible ».

Le débutant était à 800 ms jusqu'ici, soit 19 s par point : pas un adversaire faible, un adversaire **ennuyeux**, qui traversait le plateau au pas. Sa faiblesse ne vient pas de sa lenteur mais de sa vue courte — il lui faut 24 pas là où un bot qui voit tout en met 20, et 30 dans ses mauvais jours. Descendre sa vue plus bas que 6 ne le rendrait pas plus faible, seulement absent : à 5 cases, un essai sur vingt n'arrive jamais.

**C'est le classement du joueur qui choisit l'adversaire**, pas l'URL : à chaque partie, le serveur tire les bots dont l'Elo est le plus proche du sien (voir `back/src/botAccounts.ts#pickBotOpponents`). Monter fait donc monter les adversaires.

**Le niveau d'un bot ne bouge pas.** Il est fixé à la création et stocké sur son compte (`accounts.level`) ; seul son classement vit. Le déduire de l'Elo, comme au début, avait une conséquence qu'on ne voyait qu'à l'usage : un bot qu'on venait de battre devenait **moins** fort, un bot qui nous battait devenait **plus** fort, et un classement dont la grandeur mesurée change avec la mesure ne mesure plus rien. Un bot a une intelligence, il la garde ; son Elo dit seulement ce qu'il en a fait.

Le paramètre `?bot=debutant|intermediaire|confirme|expert` existe toujours dans le client, mais il ne sert plus que de repli quand la base est injoignable et qu'aucun compte de bot ne peut être tiré.

## Les cartes officielles

**Symétrique ne veut pas dire équilibré.** Une carte peut être parfaitement miroir et se traverser en ligne droite : ses murs ne sont alors que du décor, et la partie se résume à une course de vitesse.

Une carte officielle doit donc satisfaire cinq critères, vérifiés automatiquement (`back/src/mapBalance.ts`, contrôlés sur les vraies cartes par la suite de tests) :

1. **Profils de distance égaux** — personne n'a de voisin plus proche que ses adversaires.
2. **Aucune ligne droite** entre deux bases : il faut au moins un mur en travers.
3. **Un vrai détour** : le plus court chemin est plus long que la distance à vol d'oiseau, sinon les murs ne gênent personne.
4. **Aucun goulot** : il n'existe pas de case unique dont le retrait coupe deux bases — sans ça, un seul joueur posté dessus verrouille la partie.
5. **Aucune case isolée**, et **deux accès minimum** par base.

Ajouter une carte qui échoue à l'un de ces points fait échouer les tests, plutôt que d'être découvert en jouant.

## Le plateau

Le plateau est une grille de cases. Tailles envisagées : `30x30`, `40x40`, `50x50`.

Exemple de représentation (ASCII) :

```
##################
#A..............B#
#................#
#....######......#
#................#
#................#
##################
```

### Types de case

| Type | Description |
|---|---|
| Vide | Case traversable, sans effet |
| Mur | Bloque le déplacement |
| Obstacle | Bloque ou gêne le déplacement (caisse, pierre, arbre...) |
| Spawn | Point d'apparition du joueur |
| Base | Objectif à atteindre pour marquer un point |
| Téléporteur | Déplace le joueur ailleurs sur la carte |
| Glace | Le joueur glisse jusqu'au prochain obstacle |
| Lave | Case dangereuse (à définir : mort, retour au spawn, dégât...) |
| Eau | Case dangereuse ou ralentissante |
| Pont | Permet de traverser l'eau/la lave |
| Tapis roulant | Déplace le joueur automatiquement dans une direction |
| Bonus | Effet temporaire positif (vitesse, dash...) |

### Éléments qui rendent le jeu addictif

Habbo utilisait des mécaniques très simples, enrichissables avec :

- accélération temporaire
- dash d'une case
- glace (on glisse)
- tapis roulants
- téléporteurs
- portes qui changent d'état
- brouillard de guerre
- bonus de vitesse
- pièges temporaires

Tout cela reste compatible avec un moteur de grille — pas besoin de physique complexe.

## Modes de jeu

**La V1 en propose trois : Duel, FFA 3 et FFA 4.** Les règles sont exactement les mêmes dans les trois — seul le **nombre de joueurs** change, donc le nombre de bases à atteindre et à défendre. C'est ce nombre qui décide de la carte jouée : le serveur choisit une carte officielle ayant exactement autant de bases (voir `back/src/officialMaps.ts`), et complète avec des bots tant qu'il manque des joueurs. Les modes ci-dessous qui ne sont pas dans cette liste (2v2, partie privée) ne sont pas encore proposés dans l'interface.

### Duel (2 joueurs)

```
A -------- B
```

Le premier joueur à **15 points** gagne (cinq bases).

### 2v2 (Duel en équipe)

```
A B ------ C D
  Équipe 1   Équipe 2
```

4 joueurs, 2 équipes de 2. Une seule base et un seul score par équipe : entrer dans la base adverse (avec n'importe quel canard de l'équipe) rapporte un point à toute l'équipe. Premier à **10 points** gagne. Demande de la coordination avec son coéquipier plutôt qu'un simple face-à-face.

### FFA 3 joueurs

```
      A

           C

      B
```

Chaque joueur possède sa propre base et son propre spawn. Entrer sur une base adverse rapporte **+1 point**, puis retour au spawn.

### FFA 4 joueurs

```
A       B


C       D
```

Même principe que le FFA 3 joueurs, avec 4 bases/spawns répartis sur la carte (très proche de l'esprit Habbo).

### Mode privé

Création d'une salle avec un code d'invitation à partager (ex. `ABCDE`). La partie démarre lorsque tout le monde est prêt.

### Mode entraînement

Le joueur est seul, aucun score comptabilisé. Sert à tester une carte (déplacements, collisions, bonus, téléporteurs) sans la publier — voir [éditeur de cartes](04-editeur-cartes.md#mode-test).

## Matchmaking

Deux façons de démarrer une partie :

### Public

Le joueur clique sur **Jouer**. Le serveur cherche une partie existante avec de la place ; sinon, il en crée une automatiquement.

### Privé

Le joueur crée une salle et reçoit un **code**. Il partage ce code aux personnes qu'il veut inviter, elles rejoignent la salle avec ce code. La partie démarre lorsque tout le monde est prêt (voir [mode privé](#modes-de-jeu) ci-dessus).

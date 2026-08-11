# 4. Générateur & éditeur de cartes

## Génération procédurale

Au lieu d'avoir uniquement des cartes fixes, le jeu génère des cartes à partir de paramètres :

- largeur / hauteur
- densité des murs
- nombre d'obstacles
- nombre de bonus
- type de décor
- téléporteurs, eau...

Exemple de résultat :

```
##################
#A.......##.....B#
#........##......#
#................#
###..........#####
#......##........#
#......##........#
#C............D..#
##################
```

### Algorithme (garanties)

1. Les spawns sont toujours placés en premier.
2. L'algorithme ajoute ensuite les obstacles.
3. Il vérifie enfin que **tout le monde peut atteindre tout le monde** (BFS ou A*).

Garanties à respecter dans tous les cas :

- chaque spawn est accessible
- chaque base est accessible
- aucune zone fermée

## Éditeur de cartes

Fonctionnalité essentielle : le joueur peut créer ses propres cartes.

### Éléments disponibles

mur, eau, lave, glace, arbre, caisse, pierre, spawn, base, téléporteur, piège, bonus, décor.

### Outils

pinceau, gomme, remplissage, sélection, copier, coller, rotation.

### Import / export

Format **JSON** dans les deux sens.

## Mode Test

L'éditeur possède un bouton **Tester**. Le jeu démarre directement (mode entraînement, voir [gameplay](02-gameplay.md#mode-entraînement)) et le créateur peut immédiatement, sans publier la carte :

- déplacer son canard
- tester les collisions
- tester les bonus
- tester les téléporteurs
- vérifier que la carte est jouable

## Matrice texte (extraction / import)

L'éditeur sait **extraire** la carte en cours sous forme de matrice texte, et en **importer** une. Une matrice est une carte entière en quelques lignes, à garder dans un fichier comme point de sauvegarde, à s'échanger, ou à faire **générer par une IA** : les règles ci-dessous suffisent à en écrire une valide, sans rien connaître du code.

```
##############
#0..........1#
#..####..##..#
#............#
#..##..####..#
#2..........3#
##############
```

| Caractère | Case |
|---|---|
| `#` | Mur |
| `.` (ou un espace) | Case vide, traversable |
| `0` `1` `2` `3` | Spawn/base d'un joueur, un par couleur |

Règles à respecter :

- **Toutes les lignes ont la même largeur** — c'est ce qui définit la grille.
- **Le contour est entièrement fermé** par des murs. Une matrice au contour ouvert est corrigée à l'import plutôt que rejetée, mais le nombre de cases modifiées est signalé.
- **Chaque chiffre de spawn apparaît au plus une fois** : une couleur = un seul emplacement (sinon deux joueurs partageraient la même couleur en partie).
- **2 à 4 spawns** pour que la carte soit jouable (voir [modes de jeu](02-gameplay.md#modes-de-jeu)) — une matrice qui en a moins s'importe quand même, elle n'est simplement pas encore jouable.
- **Taille** entre 5×5 et 30×30 de zone jouable, murs du contour en plus (donc 7×7 à 32×32 lignes/colonnes de matrice). La limite haute vient du rendu, qui dessine un objet 3D par case.

Importer remplace intégralement la carte en cours d'édition — l'éditeur prévient avant d'écraser un travail non sauvegardé — et la carte importée est traitée comme une **nouvelle** carte : la sauvegarder ne modifie pas celle qu'on éditait avant.

## Où sont stockées les cartes

**Les cartes des joueurs vivent en base** (table `maps`, voir `db/init/05-maps.sql`), plus dans le navigateur. Une carte sauvegardée survit donc à un vidage de cache et se retrouve depuis n'importe quel appareil.

Conséquence directe : **sauvegarder demande un compte**. Sans propriétaire, une carte ne peut être ni retrouvée plus tard, ni protégée d'un autre joueur — le serveur refuse d'ailleurs d'écraser une carte qui n'appartient pas au compte qui la demande, connaître son identifiant ne suffit pas. Créer et tester une carte reste possible sans compte ; c'est l'enregistrement qui en réclame un.

La colonne `kind` distingue les cartes **des joueurs** de celles **officielles** (celles proposées en matchmaking, voir [gameplay](02-gameplay.md#modes-de-jeu)). Les cartes officielles sont encore des fichiers JSON versionnés dans `back/maps/` : elles rejoindront la table ensuite, la colonne existe déjà pour éviter une seconde migration.

## Publication des cartes

Les joueurs pourront :

- publier une carte, en la nommant et en ajoutant une description
- choisir sa visibilité : **publique** ou **privée**

Les autres joueurs pourront alors : noter, télécharger, jouer.

### Idées d'évolution (voir aussi [idées futures](09-idees-futures.md))

- Workshop communautaire pour publier/noter/télécharger les cartes
- Rotation hebdomadaire des cartes les plus populaires
- Classement des créateurs, en plus du classement des joueurs

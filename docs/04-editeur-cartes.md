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

## Publication des cartes

Les joueurs pourront :

- publier une carte, en la nommant et en ajoutant une description
- choisir sa visibilité : **publique** ou **privée**

Les autres joueurs pourront alors : noter, télécharger, jouer.

### Idées d'évolution (voir aussi [idées futures](09-idees-futures.md))

- Workshop communautaire pour publier/noter/télécharger les cartes
- Rotation hebdomadaire des cartes les plus populaires
- Classement des créateurs, en plus du classement des joueurs

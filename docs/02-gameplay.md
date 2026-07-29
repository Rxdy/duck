# 2. Gameplay

## Principe

Chaque joueur contrôle un canard sur un plateau en grille.

Déplacements possibles : **Haut / Bas / Gauche / Droite**.

- Une seule case est parcourue par action.
- Le déplacement est instantané côté règles, mais animé côté rendu.
- Les joueurs ne déplacent jamais eux-mêmes leur canard « librement » : ils envoient une intention de direction, le serveur valide et exécute (voir [architecture technique](06-architecture-technique.md#protocole-websocket)).

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

### Duel (2 joueurs)

```
A -------- B
```

Le premier joueur à **5 points** gagne.

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

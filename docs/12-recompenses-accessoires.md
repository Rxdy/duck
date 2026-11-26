# Pièces, lots et accessoires

**Statut :** les accessoires en jeu, la garde-robe et les deux cadeaux sont développés (étapes 1 et 2). Les pièces,
les lots et l'album restent à faire ; leurs montants sont des réglages de départ, à ajuster avec de vraies parties.

## Décidé

- On **dépense un montant fixe** de pièces de monnaie et on gagne **un accessoire au hasard**. Le joueur ne le
  choisit pas.
- Un accessoire déjà gagné ne peut pas être regagné.
- Il mélange ensuite librement les accessoires qu'il possède.
- Pas d'argent réel pour l'instant.
- Les parties personnalisées ne comptent pas au classement.

## La boucle

```
Jouer une partie publique  →  gagner des pièces  →  ouvrir un lot (100)
        ↑                                                   ↓
        └──────────  porter son canard  ←  garde-robe  ←  nouvel accessoire
```

Dans la suite, « pièces » désigne la monnaie et « accessoire » un objet à porter.

## 1. Gagner des pièces

| Résultat | Duel | FFA 4 |
|---|---|---|
| 1er | 30 | 35 |
| 2e | 10 | 20 |
| 3e | | 15 |
| 4e | | 10 |

- La moyenne est de 20 pièces par partie à niveau égal, dans les deux modes.
- **Première victoire du jour : +50.**
- Comptes uniquement. Les parties d'un invité ne rapportent pas de pièces, même après son inscription.
- Aucun gain : partie personnalisée, entraînement, test de carte.

Contre les abus (les parties publiques sont complétées par des bots, donc faciles à enchaîner) :

- seules les **15 premières parties du jour** rapportent ;
- aucun gain si on quitte avant la fin, ou si on n'a presque pas joué (moins de 20 déplacements) ;
- le serveur calcule seul les gains.

Le « jour » commence à minuit, heure de Paris.

## 2. Ouvrir un lot

- La dépense est d'un **montant fixe : 100 pièces**, soit environ 5 parties.
- On gagne **un accessoire au hasard**.
- **On ne peut pas regagner un accessoire** : le tirage ne porte que sur ceux qu'on ne possède pas.
- Tous les accessoires restants ont **la même chance** : pas de rareté.
- Quand on possède tout, le bouton est désactivé : on ne paie jamais pour rien.

## 3. Les deux accessoires gratuits

| Moment | Cadeau |
|---|---|
| Inscription | 1 accessoire au hasard |
| Fin du tutoriel | 1 accessoire au hasard |

Rien d'autre n'est offert. Comme dans un lot, on ne reçoit jamais un accessoire déjà possédé.

- Chaque cadeau n'est donné qu'**une fois par compte**.
- Un invité qui termine le tutoriel reçoit ce cadeau à son inscription, depuis le même navigateur : il a alors 2
  accessoires.
- Le tutoriel se joue dans le navigateur : le serveur ne peut pas vérifier qu'il a été terminé. Le risque est limité à
  un accessoire par compte.

Développé dans `back/src/wardrobe.ts`. Les comptes existants gardent leurs anciens chapeaux, repris comme
accessoires (`db/init/16-wardrobe.sql`).

## 4. Combien de temps pour tout avoir

Calcul pour le catalogue actuel de **213 accessoires** à gagner : une fois les 2 cadeaux reçus, il reste 211 lots, soit
21 100 pièces, à 20 pièces par partie en moyenne, bonus du jour obtenu chaque jour. Le catalogue grandit encore.

| Rythme | Pièces par jour | Lots par semaine | Tout le catalogue |
|---|---|---|---|
| 3 parties par jour | 110 | environ 8 | 192 jours |
| 5 parties par jour | 150 | environ 10 | 141 jours |
| 15 parties par jour (plafond) | 350 | environ 24 | 61 jours |

Un joueur qui gagne moins, ou pas tous les jours, mettra plus longtemps. Le catalogue doit encore grandir (70 thèmes
faits sur 90). Les accessoires de visage restent peu nombreux : à compléter.

## 5. Les écrans

**Garde-robe** (développée)

- Le canard en haut, de face ou de dos, dans les 4 couleurs. Il reste en place : seule la collection défile.
- 5 emplacements, vides au départ. Un appui sur un accessoire le met à sa place, ou remplace celui qui y est ; un
  second appui, ou un appui sur l'emplacement, le retire.
- Des images et pas de noms. Tout le catalogue, ce qu'on possède d'abord ; le reste en ombre.
- Tri : tout (par défaut), tête, visage, corps, dos, main.
- « Enregistrer » garde la tenue sans changer le canard ; « Porter » habille le canard sans changer les tenues
  enregistrées. « Vider » n'efface que la tenue enregistrée.
- Le classement montre le canard de chacun. Les bots sont habillés selon leur niveau.
- « Aléatoire » compose une tenue avec une pièce possédée à chaque emplacement ; rien n'est gardé sans
  « Enregistrer ». « Vider » demande une confirmation.
- Profil : une page en sections sur téléphone et tablette, un menu déroulant sur ordinateur.
- 3 tenues enregistrables ; la tenue portée est visible en partie.

**Lot** (depuis la garde-robe)

- Solde, prix, nombre d'accessoires restant à découvrir.
- « Ouvrir un lot », puis une courte révélation (passable, réduite si les animations le sont).
- Ensuite : « L'essayer » ou « Ouvrir un autre ».

**Fin de partie** : les pièces gagnées, et ce qu'il manque avant le prochain lot.

**Album de collection** (validé)

- Tous les accessoires du catalogue, rangés par thème.
- Possédé : en couleur, avec « L'essayer ». Manquant : en silhouette, sans son nom, pour garder la surprise.
- Progression : au total (« 12 / 213 ») et par thème ; un thème complet est mis en valeur.
- Les affaires réservées à Coincoin n'y figurent pas.
- Un nouvel accessoire y est signalé jusqu'à ce qu'on l'ait vu.

Il ne demande aucune donnée de plus que les possessions. Un accessoire peut servir à plusieurs thèmes : il n'est
compté qu'une fois au total.

## 6. Côté serveur

Le navigateur ne décide de rien : ni du solde, ni du tirage, ni de la tenue.

| Donnée | Contenu |
|---|---|
| Catalogue | identifiant, emplacement |
| Possessions | compte, accessoire, date (un accessoire au plus une fois par compte) |
| Mouvements de pièces | compte, montant, motif, date ; le solde en est la somme |
| Tenue | compte, un accessoire par emplacement |

- Ouvrir un lot se fait en **une seule transaction, compte verrouillé** : vérifier le solde, débiter,
  tirer, attribuer. Deux clics simultanés ne dépensent pas deux fois les mêmes pièces.
- Chaque demande porte un identifiant unique : renvoyée après une coupure, elle redonne le même résultat sans
  redébiter.
- Hasard produit par le serveur avec un générateur sûr (`crypto.randomInt`).
- Une tenue n'est acceptée que si le compte possède chaque accessoire, au bon emplacement.
- Migrations uniquement additives.

## 7. Si un jour on vend

Vendre des lots au hasard, ou des pièces servant à les ouvrir, est encadré ou interdit selon les pays, avec un enjeu
particulier pour les mineurs. Il faudrait un avis juridique avant. Une vente directe d'accessoires choisis serait un
autre modèle.

## 8. Ordre de réalisation

1. Intégrer les accessoires au jeu (affichage en partie, performances sur téléphone).
2. Garde-robe et tenue enregistrée.
3. Pièces : gains, plafond, historique.
4. Lots : tirage et révélation.
5. Album de collection.

## À valider

- [ ] Prix et gains : 100 par lot, environ 20 par partie, +50 à la première victoire du jour.
- [ ] Plafond de 15 parties rémunérées par jour.

# Coffres et accessoires

**Statut :** les accessoires en jeu, la garde-robe, les deux cadeaux et les coffres sont développés (coffres :
`back/src/chests.ts`, `db/init/19-chests.sql`, places sur l'accueil). L'album reste à faire. Les coffres remplacent les pièces et les lots prévus au départ (décision du 27/11/2026) : il n'y a pas de
monnaie.

## Décidé

- **Une victoire donne un coffre.** Seul le 1er gagne un coffre, en Duel comme en FFA. Aucun bonus pour la première
  victoire du jour.
- Le coffre a une rareté, tirée au hasard. Il s'ouvre après un temps d'attente, puis révèle ses accessoires.
- Un accessoire déjà gagné ne peut pas être regagné. Il mélange ensuite librement les accessoires qu'il possède.
- Pas d'argent réel.
- Les parties personnalisées ne comptent pas au classement.

## La boucle

```
Gagner une partie publique  →  un coffre  →  lancer son ouverture  →  attendre  →  l'ouvrir
        ↑                                                                            ↓
        └──────────────  porter son canard  ←  garde-robe  ←  nouveaux accessoires  ←┘
```

## 1. Les coffres

| Coffre | Chance | Temps d'ouverture | Accessoires |
|---|---|---|---|
| Cuivre | 75 % | 5 min | 1 |
| Argent | 20 % | 30 min | 3 |
| Or | 5 % | 1 h | 5 |

- **4 places.** Avec 4 coffres en attente, une victoire ne donne rien ; l'écran de fin le dit.
- **Une seule ouverture à la fois.** Le joueur choisit le coffre à lancer ; les autres attendent leur tour.
- Le temps écoulé, le coffre est **prêt** : un appui l'ouvre et révèle ses accessoires.
- En moyenne : 1,6 accessoire et 13 minutes d'attente par coffre.

## 2. Ce qui donne un coffre

- Une **victoire** (1re place) dans une **partie publique**, avec un **compte**.
- Rien pour : un invité, une partie personnalisée, l'entraînement, un test de carte.
- Contre les abus (les parties publiques sont complétées par des bots, donc faciles à enchaîner) :
  - seules les **15 premières parties du jour** peuvent donner un coffre ;
  - rien si on quitte avant la fin, ou si on a presque pas joué (moins de 20 déplacements) ;
  - le serveur décide seul.
- Le « jour » commence à minuit, heure de Paris.

## Le tirage

- Le serveur tire la rareté à la victoire, et les accessoires **à l'ouverture** : un accessoire ajouté au catalogue
  entre temps peut sortir.
- **Jamais un accessoire déjà possédé.** Tous ceux qui restent ont la même chance : la rareté porte sur le coffre, pas
  sur les accessoires.
- S'il en reste moins que le coffre n'en donne, on reçoit ce qui reste. Quand on possède tout, on ne gagne plus de
  coffre.

## 3. Les deux accessoires gratuits

| Moment | Cadeau |
|---|---|
| Inscription | 1 accessoire au hasard |
| Fin du tutoriel | 1 accessoire au hasard |

Rien d'autre n'est offert. Comme dans un coffre, on ne reçoit jamais un accessoire déjà possédé.

- Chaque cadeau n'est donné qu'**une fois par compte**.
- Un invité qui termine le tutoriel reçoit ce cadeau à son inscription, depuis le même navigateur : il a alors 2
  accessoires.
- Le tutoriel se joue dans le navigateur : le serveur ne peut pas vérifier qu'il a été terminé. Le risque est limité à
  un accessoire par compte.

Développé dans `back/src/wardrobe.ts`. Les comptes existants gardent leurs anciens chapeaux, repris comme
accessoires (`db/init/16-wardrobe.sql`).

## 4. Combien de temps pour tout avoir

Pour le catalogue actuel de **213 accessoires**, une fois les 2 cadeaux reçus il en reste 211, soit environ 132 coffres.

| Rythme | Victoires par jour (environ) | Accessoires par jour | Tout le catalogue |
|---|---|---|---|
| 3 parties par jour | 1,5 | 2,4 | environ 90 jours |
| 15 parties par jour (plafond) | 7 | 11 | environ 20 jours |

Un gros joueur est freiné par les 4 places et l'ouverture une à une. Ce rythme est accepté : **le catalogue devra
grandir** (70 thèmes faits sur 90, accessoires de visage peu nombreux).

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

**Coffres** (accueil, en bas)

- 4 places, toujours visibles, sans texte d'explication : vide, en attente, en cours (temps restant), prêt.
- Appui sur un coffre en attente : lancer son ouverture (refusé si une autre est en cours).
- Appui sur un coffre prêt : la révélation, courte et passable (réduite si les animations le sont). Ensuite :
  « Garde-robe », qui y mène.
- La page tient à l'écran sans défiler, sur téléphone comme sur ordinateur.

**Fin de partie** : le coffre gagné, ou « Tes 4 places sont pleines ».

**Album de collection** (validé)

- Tous les accessoires du catalogue, rangés par thème.
- Possédé : en couleur, avec « L'essayer ». Manquant : en silhouette, sans son nom, pour garder la surprise.
- Progression : au total (« 12 / 213 ») et par thème ; un thème complet est mis en valeur.
- Les affaires réservées à Coincoin n'y figurent pas.
- Un nouvel accessoire y est signalé jusqu'à ce qu'on l'ait vu.

Il ne demande aucune donnée de plus que les possessions. Un accessoire peut servir à plusieurs thèmes : il n'est
compté qu'une fois au total.

## 6. Côté serveur

Le navigateur ne décide de rien : ni du coffre, ni du temps, ni du tirage, ni de la tenue.

| Donnée | Contenu |
|---|---|
| Catalogue | identifiant, emplacement |
| Possessions | compte, accessoire, date (un accessoire au plus une fois par compte) |
| Coffres | compte, rareté, gagné le, ouverture lancée le (vide sinon), ouvert le (vide sinon), partie d'origine |
| Tenue | compte, un accessoire par emplacement |

- Le temps se calcule sur l'horloge du serveur : changer l'heure du téléphone ne fait rien.
- Lancer et ouvrir se font en **une transaction, compte verrouillé** : deux appuis simultanés ne lancent pas deux
  ouvertures, n'ouvrent pas deux fois le même coffre.
- Une partie ne donne qu'un coffre (contrainte sur la partie d'origine).
- Hasard produit par le serveur avec un générateur sûr (`crypto.randomInt`).
- Une tenue n'est acceptée que si le compte possède chaque accessoire, au bon emplacement.
- Migrations uniquement additives.

## 7. Si un jour on vend

Vendre des coffres au hasard, ou de quoi accélérer leur ouverture, est encadré ou interdit selon les pays, avec un
enjeu particulier pour les mineurs. Il faudrait un avis juridique avant. Une vente directe d'accessoires choisis serait
un autre modèle.

## 8. Ordre de réalisation

1. Intégrer les accessoires au jeu (affichage en partie, performances sur téléphone). Fait.
2. Garde-robe et tenue enregistrée. Fait.
3. Coffres : gain à la victoire, plafond, ouverture, tirage.
4. Coffres à l'accueil et révélation ; coffre à la fin de partie.
5. Album de collection.
6. Agrandir le catalogue.

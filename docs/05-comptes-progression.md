# 5. Comptes & progression

## Comptes utilisateurs

- Création de compte
- Connexion via **Google**, **Discord**, **GitHub** ou email
- Profil public
- Statistiques et historique des parties
- Sauvegarde cloud de la progression

### Robustesse du mot de passe

Deux règles qui se complètent au lieu de se doubler.

**Le socle**, obligatoire : **10 caractères** minimum, et au moins une
minuscule, une majuscule, un chiffre et un caractère spécial. Il est vérifié
des deux côtés — la jauge du formulaire guide, elle ne protège pas, puisqu'on
peut poster sur `/auth/register` sans passer par elle.

**L'entropie**, au-dessus du socle : le formulaire d'inscription note ensuite
le mot de passe en **bits**, sur une barre continue à huit paliers, de
« Beaucoup trop faible » à « Redoutable ». Le socle seul laisserait passer
`Aaaaaaaaa1!` — onze caractères, quatre familles, neuf fois la même lettre —
que l'entropie, elle, refuse à 49 bits. L'échelle est calée sur ce que le socle
produit au minimum (dix caractères dans les quatre familles valent ~66 bits,
donc « Presque correct » commence là) et la barre n'est pleine qu'au dernier
palier, à 160 bits : il doit toujours rester quelque chose à gagner pour qui
veut faire mieux. `Canard2024!` pèse 66 bits, une phrase comme
« Mon canard jaune adore le pain 7! » en pèse 161.

Cette note reste une estimation. Elle pénalise les répétitions et les suites
(`abcdef`, `123456`, `azerty`) mais ignore les dictionnaires et les fuites
connues : `Motdepasse123!` y paraît honnête alors que sa racine est en tête des
listes d'attaque. Le corriger demanderait une bibliothèque dédiée (zxcvbn) et
son dictionnaire embarqué.

### Récapitulatif des parties

La page Compte liste les parties du joueur sous forme de cartes : mode, heure,
durée, et le tableau des scores finaux avec la couleur de chaque canard. Les
**trois dernières** sont visibles d'emblée — assez pour reconnaître sa dernière
session, assez peu pour que les statistiques restent à l'écran ; « voir toutes
les parties » déroule le reste, qui défile *dans* la section plutôt que
d'allonger la page.

Le nom de la carte n'y figure pas : il ne dit rien de la partie qu'on cherche à
retrouver. Les identifiants anonymes des adversaires n'en sortent pas non plus,
ils permettraient de pister un joueur d'une partie à l'autre.

Le mode et la durée sont enregistrés depuis `db/init/09-match-recap.sql` ; les
parties antérieures ne les ont pas et l'affichent (`—`, ou l'effectif à la
place du mode) plutôt que d'inventer « Duel, 0 s ».

## Progression

- XP
- Niveaux
- Défis quotidiens
- Défis hebdomadaires
- Succès (achievements)
- Saisons, avec récompenses **uniquement cosmétiques** (pas de pay-to-win)

## Personnalisation

- Skins de canards
- Couleurs
- Chapeaux
- Accessoires
- Traînées de déplacement
- Animations de victoire
- Emotes
- Titres de joueur
- Cadres de profil

## Classement

Classement général unique (**pas par mode** : un seul niveau à comprendre), basé sur un **Elo qui démarre à zéro**.

Zéro plutôt que la valeur médiane habituelle des systèmes Elo (1000 ou 1500) : ceux-ci mesurent un niveau, et placer tout le monde au milieu de l'échelle permet de descendre autant que de monter. Ici l'objectif est la **progression**, pas la mesure — et comme le classement ne descend jamais sous zéro, un joueur qui débute **ne peut rien perdre tant qu'il n'a rien gagné**. Ses premières parties ne peuvent que le faire monter. Au passage, cela l'oriente vers les adversaires les plus faibles, puisque le matchmaking choisit par proximité de classement.

### Comment les points se répartissent

Chaque paire de joueurs est traitée comme un **duel séparé** : à 4 joueurs, chacun en joue 3. Pour chaque duel, on compare le résultat attendu — la probabilité de finir devant, d'après l'écart de classement — au résultat réel. L'ajustement est divisé par le nombre d'adversaires, pour qu'une partie à 4 ne pèse pas trois fois un duel.

**Seul le classement compte, pas l'écart de score** : finir 15-14 ou 15-0 devant quelqu'un rapporte pareil. Sinon écraser un adversaire déjà battu vaudrait mieux que de gagner proprement.

**Une défaite coûte la moitié de ce qu'une victoire rapporte.** C'est une entorse assumée à l'Elo classique, qui est à somme nulle : perdre autant qu'on gagne rend une mauvaise série décourageante, surtout dans un jeu où l'on peut finir dernier sur quatre sans avoir mal joué. Le coût de ce choix est une **inflation lente** — le classement moyen monte avec le temps, donc un score se compare entre joueurs actuels, pas d'une année sur l'autre.

Pour quatre joueurs de même niveau :

| Place | Variation |
|---|---|
| 1er | +16 |
| 2e | +8 |
| 3e | 0 |
| 4e | −8 |

Battre un joueur mieux classé rapporte davantage, et **l'échange est réduit de moitié contre un bot** — sinon la façon la plus rapide de monter serait d'enchaîner les parties contre le plus faible qu'on trouve.

**Les bots sont classés comme les autres, sans plancher ni plafond.** Ils entrent au classement de référence de leur niveau (200 à 1800, avec un bruit de ±140 pour qu'ils ne partagent pas tous le même score au point près), puis leur Elo bouge avec leurs résultats — c'est ce qui fait vivre le haut du tableau. Leur **niveau de jeu, lui, ne bouge jamais** : voir [02-gameplay.md#les-bots](02-gameplay.md#les-bots).

La population est comptée **par niveau**, pas seulement en total (`back/src/botAccounts.ts#planPopulation`). C'est ce qui manquait : née à quatre niveaux, elle y restait pour toujours puisque le total y était, et la tête du classement butait sur un plafond de verre au sommet des experts (1540). Ajouter un niveau fait maintenant grandir la population plutôt que de rester sans effet — et aucun bot existant n'est déclassé pour tenir un chiffre rond.

### Statistiques associées

- parties jouées
- victoires / défaites
- ratio
- score moyen
- temps moyen

## Interface (pages principales)

Accueil, Jouer, Créer une carte, Mes cartes, Classement, Profil, Paramètres.

## Profil

Pseudo, avatar, statistiques, succès, historique, cartes créées.

# 5. Comptes & progression

## Comptes utilisateurs

- Création de compte
- Connexion via **Google**, **Discord**, **GitHub** ou email
- Profil public
- Statistiques et historique des parties
- Sauvegarde cloud de la progression

### Robustesse du mot de passe

Une seule règle : atteindre **60 bits d'entropie**. Ni longueur ni familles de caractères imposées — une longue phrase en
minuscules passe, un court `Short1!` non. C'est un minimum, pas un plafond : la jauge de l'inscription le marque d'un repère et continue de monter au-delà
(« C'est bon », « Solide », « Excellent »). Le serveur applique le même calcul (`back/src/passwordStrength.ts`, copie de celui du front à garder
identique), puisqu'on peut poster sur `/auth/register` sans passer par le formulaire.

C'est une estimation : elle pénalise les répétitions et les suites (`abcdef`, `123456`, `azerty`) mais ignore les
dictionnaires et les fuites connues. Le corriger demanderait une bibliothèque dédiée (zxcvbn).

### Pseudo et email uniques

Uniques sans tenir compte de la casse (`db/init/13-unique-sans-casse.sql`) ; l'inscription dit lequel est pris, et la
connexion accepte l'un ou l'autre quelle que soit la casse. Si une base contient déjà des doublons à la casse près,
l'index correspondant n'est pas créé (avertissement au démarrage) et aucun compte n'est modifié.

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

## Activer la connexion avec Google

Le bouton « Continuer avec Google » reste masqué tant que le serveur n'a pas d'identifiant client.

1. Dans la [console Google Cloud](https://console.cloud.google.com/apis/credentials), créer un projet, configurer
   l'écran de consentement OAuth, puis un « ID client OAuth » de type **Application Web**.
2. « Origines JavaScript autorisées » : `https://duck.rxdy.fr`, et pour le développement `http://localhost:5173` et
   `http://localhost`. Aucune URI de redirection n'est nécessaire.
3. Donner l'ID client (pas le « secret », inutile ici) au serveur :
   - développement : `GOOGLE_CLIENT_ID=... make dev` ;
   - production : ligne `GOOGLE_CLIENT_ID=...` dans le `.env` à côté de `docker-compose.prod.yml`.

Si l'adresse Google correspond à un compte existant créé par mot de passe, les deux sont rattachés. L'inscription ne
vérifiant pas les adresses, l'ancien mot de passe et les sessions ouvertes sont alors effacés.

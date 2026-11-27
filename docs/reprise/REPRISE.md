# Reprendre le travail (état au 27/11/2026, soir)

## Sur un autre poste

```bash
git clone https://github.com/Rxdy/duck.git && cd duck
git switch fix/glissade
make poste                   # UNE fois : identité Git, connexion GitHub, dépendances (Node 22 et Docker requis)
make dev                     # jeu sur http://localhost:5173
make check                   # tout ce que vérifie la CI (Postgres démarré par make)
```

La base locale ne voyage pas avec Git : sur le nouveau poste elle repart de zéro (les bots sont recréés et habillés au
démarrage). Les comptes de test de l'ancien poste n'existent pas : inscris-en un depuis le jeu. Pour lui donner tout le
catalogue (test seulement), après `make dev` :

```bash
IDS=$(python3 -c "import json;print(','.join(\"'%s'\"%i['id'] for i in json.load(open('back/src/accessories.json'))))")
docker compose exec -T db psql -U duck -d duck -c "insert into account_items(account_id,item_id,source)
  select a.id, x, 'test' from accounts a, unnest(array[$IDS]) x where a.email='TON_EMAIL' on conflict do nothing"
```

## Branches

| Branche | Contenu |
|---|---|
| `fix/glissade` | **La branche à continuer** : contient `fix/responsive` et tout le travail du 27/11, puis PR vers `dev` |
| `fix/responsive` | Ancienne branche de travail, entièrement reprise dans `fix/glissade` |
| `feature/notes-graphismes` | Coincoin fluo intégré, plus `dev` fusionné |
| `art/accessoires` | Ancien atelier et planches PNG. **Son catalogue n'est plus la référence** |

games-hub : `main` est à jour ; l'ancien travail local est gardé sur `sauvegarde/ancien-front`.

## Où on en est

- **Accessoires** : catalogue dans `front/src/lib/accessories/`. Après un ajout : `make accessories` (liste du serveur ;
  un test échoue sinon). Atelier : `cd front && npx vite --port 5180`, puis `/atelier/`. Démo de la glissade :
  http://localhost:5173/atelier/glissade.html (ou le port choisi, voir « Poste » ci-dessous). Planches : `node art/accessoires/rendre.mjs` (Playwright à part).
- **Garde-robe** : 5 emplacements, 3 tenues, « Enregistrer » et « Porter » distincts, ombres, filtre, chargement
  progressif. 1 accessoire au hasard à l'inscription et 1 à la fin du tutoriel.
- **Social** : amis par code joueur, salons de parties personnalisées (jamais classées), connexion par email seul.
- **Invité** : duel seulement ; progression reprise à l'inscription.
- **Rythme** : un pas = une glissade entière de 180 ms, imposé par le serveur (`docs/02-gameplay.md`).
- **Toucher** : la victime reste visible jusqu'à l'arrivée de l'attaquant, puis éjection et éclat de sa couleur
  (`lib/tags.ts`, `useDuckMotion#knockOut`). Chance de fuir de 90 ms côté serveur (`room.ts#FLEE_MS`) : celui qui
  part pendant ce délai s'échappe. Atelier : `/atelier/toucher.html` (`?lent=8` pour le ralenti). Pas encore dans le
  tutoriel ni le mode libre (moteur local).
- **Coffres** : `back/src/chests.ts`, migration 19, 4 places en bas de l'accueil (taille selon l'écran), ouverture en
  plein écran (`ChestOpening.vue`), coffre gagné à l'écran de fin. Testé de bout en bout (partie gagnée contre un
  bot) ; pas sur un vrai téléphone.
- **Créatif** : `/creatif` est un menu (Éditeur `/creatif/editeur`, Mes cartes, Galerie). Galerie publique : publier
  depuis Mes cartes (refus motivé si la carte n'est pas équilibrée), essayer contre des bots, copier chez soi
  (migration 18). Pas encore de signalement (#33).
- **Décor de carte** : réglage Options → Affichage (Tactique par défaut, Paysage, Auto). Sol fusionné en un seul
  appel de dessin. L'herbe actuelle ne plaît pas : à refaire (3 pistes à montrer).
- **Fond des menus** : une seule image pour toutes les pages (composition « défaut » de la saison).
- **Garde-robe** : confirmation avant de quitter avec une tenue modifiée (`useLeaveGuard`).

## Décisions de l'utilisateur à respecter

- Les pages tiennent à l'écran sans défiler, sur tous les appareils (la collection de la garde-robe défile seule).
- Interface sobre (« Ardoise ») : seuls les canards brillent un peu.
- Profil : page en sections sur téléphone, menu déroulant seulement sur ordinateur ; la garde-robe s'atteint par là.
- Coffres (remplacent les pièces) : une victoire publique (1re place) donne un coffre Cuivre 75 % (5 min, 1
  accessoire), Argent 20 % (30 min, 3) ou Or 5 % (1 h, 5). 4 places, une ouverture à la fois, jamais deux fois le même
  accessoire, aucun argent réel (`docs/12-recompenses-accessoires.md`). Album de collection validé.
- Coincoin (coach) garde une seule tenue.
- Pop culture : clins d'œil originaux seulement, ni personnage, ni logo, ni nom protégé.

## À faire

Voir les issues GitHub (pages du profil, album, revisionnage des parties, etc.). En cours ou décidé ce soir :

- Décor des cartes plus vivant : 3 pistes à montrer en captures (pelouse douce, diorama, jardin la nuit), sans la
  teinte de territoire mélangée au vert. Question en attente : décors posables dans l'éditeur, obstacles ou au sol ?
- Agrandir le catalogue d'accessoires (les coffres le vident vite : environ 90 jours à 3 parties par jour).
- Toucher : appliquer la chance de fuir au tutoriel et au mode libre ; cas du toucher sur la base adverse.
- Aussi : BPMN (PNG seuls, couleurs d'avancement), mode duo, retouches d'accessoires (couleur du joueur sur le
  samouraï, le rockeur, le pharaon), mesure de la fluidité sur un vrai téléphone.

## Poste (constaté le 27/11)

- Le port 5173 et la base 5432 peuvent être pris par un autre projet : Duck tourne alors sur
  `make dev FRONT_PORT=5174` avec `ALLOWED_ORIGINS=http://localhost:5174,http://127.0.0.1:5174` côté serveur, et la
  base Duck sur 5433 (`DATABASE_URL=postgres://duck:duck@localhost:5433/duck`, aussi pour les tests du serveur).
- Sur `localhost:5174`, un ancien service worker d'un autre projet peut servir sa page : utiliser
  `127.0.0.1:5174` ou le désinscrire.
- Comptes de test locaux : testeur1 n'a plus d'accessoires (pour tester les coffres), testeur2 a tout le catalogue.

Avant la mise en production : sauvegarder la base. Les migrations 14 à 19 sont additives, sauf la 15 qui retire
l'unicité du pseudo (aucune donnée supprimée). 18 : galerie des cartes ; 19 : coffres.

Règles des nouveaux modes : `docs/11-nouveaux-modes.md`.

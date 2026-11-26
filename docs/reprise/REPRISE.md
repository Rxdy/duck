# Reprendre le travail (état au 26/11/2026, soir)

## Sur un autre poste

```bash
git clone https://github.com/Rxdy/duck.git && cd duck
git switch fix/responsive
make install && make dev     # Node 22 et Docker requis ; jeu sur http://localhost:5173
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
| `fix/responsive` | **La branche à continuer** (part de `feature/notes-graphismes`), puis PR vers `dev` |
| `feature/notes-graphismes` | Coincoin fluo intégré, plus `dev` fusionné |
| `art/accessoires` | Ancien atelier et planches PNG. **Son catalogue n'est plus la référence** |

games-hub : `main` est à jour ; l'ancien travail local est gardé sur `sauvegarde/ancien-front`.

## Où on en est

- **Accessoires** : catalogue dans `front/src/lib/accessories/`. Après un ajout : `make accessories` (liste du serveur ;
  un test échoue sinon). Atelier : `cd front && npx vite --port 5180`, puis `/atelier/`. Démo de la glissade :
  http://localhost:5173/atelier/glissade.html. Planches : `node art/accessoires/rendre.mjs` (Playwright à part).
- **Garde-robe** : 5 emplacements, 3 tenues, « Enregistrer » et « Porter » distincts, ombres, filtre, chargement
  progressif. 1 accessoire au hasard à l'inscription et 1 à la fin du tutoriel.
- **Social** : amis par code joueur, salons de parties personnalisées (jamais classées), connexion par email seul.
- **Invité** : duel seulement ; progression reprise à l'inscription.
- **Rythme** : un pas = une glissade entière de 180 ms, imposé par le serveur (`docs/02-gameplay.md`).

## Décisions de l'utilisateur à respecter

- Les pages tiennent à l'écran sans défiler, sur tous les appareils (la collection de la garde-robe défile seule).
- Interface sobre (« Ardoise ») : seuls les canards brillent un peu.
- Profil : page en sections sur téléphone, menu déroulant seulement sur ordinateur ; la garde-robe s'atteint par là.
- Pièces de monnaie : un montant fixe donne un accessoire au hasard, jamais deux fois le même, pas de rareté, aucun
  argent réel (`docs/12-recompenses-accessoires.md`). Album de collection validé.
- Coincoin (coach) garde une seule tenue.
- Pop culture : clins d'œil originaux seulement, ni personnage, ni logo, ni nom protégé.

## À faire

Voir les issues GitHub (pages du profil, album, revisionnage des parties, etc.). Aussi : règle du « toucher » à choisir,
BPMN (PNG seuls, couleurs d'avancement), pièces et lots, mode duo, retouches d'accessoires (couleur du joueur sur le
samouraï, le rockeur, le pharaon), mesure de la fluidité sur un vrai téléphone.

Avant la mise en production : sauvegarder la base. Les migrations 14 à 17 sont additives, sauf la 15 qui retire
l'unicité du pseudo (aucune donnée supprimée).

Règles des nouveaux modes : `docs/11-nouveaux-modes.md`.

# db

Service PostgreSQL (comptes, progression, classement — voir [docs/05-comptes-progression.md](../docs/05-comptes-progression.md)).

Pas de code applicatif ici : c'est l'image officielle `postgres:16-alpine` (voir `docker-compose.yml`) avec un volume nommé `db_data` pour la persistance.

## `init/`

Scripts `.sql` ou `.sh` exécutés automatiquement **une seule fois**, à la création du volume (montés sur `/docker-entrypoint-initdb.d`, ordre alphabétique). Convention : `NN-description.sql` (ex. `01-schema.sql`, `02-seed.sql`).

## Variables d'environnement (dev, voir `docker-compose.yml`)

| Variable | Valeur dev |
|---|---|
| `POSTGRES_USER` | `duck` |
| `POSTGRES_PASSWORD` | `duck` |
| `POSTGRES_DB` | `duck` |

Le service `back` s'y connecte via `DATABASE_URL=postgres://duck:duck@db:5432/duck`.

À faire avant d'écrire le premier schéma : choisir l'outil de migration/ORM (ex. Drizzle, Prisma, ou SQL brut versionné ici).

## Tests

Le schéma est testé par `back/src/schema.db.test.ts`, lancé avec la suite du
serveur (`cd back && npm test`). Il couvre ce que le code applicatif ne peut
pas vérifier seul :

- **La dérive de schéma.** `db/init/*.sql` et `back/src/schema.ts` décrivent les
  mêmes tables et sont maintenus à la main, sans outil de migration. Le test
  compare les colonnes des deux côtés, dans les deux sens, et vérifie que les
  colonnes obligatoires le sont aussi en base.
- **Les garanties dont le code dépend sans les revérifier** : unicité du pseudo
  et de l'adresse, suppression en cascade (sessions, skins et cartes d'un
  compte supprimé), valeurs par défaut (classement à 1000, rôle `human`).
- **L'idempotence des scripts d'init**, rejoués à chaque démarrage
  d'environnement : un script qui ne supporte pas d'être relancé bloquerait
  n'importe quelle machine neuve au deuxième lancement.

Une partie enregistrée survit volontairement à la suppression d'un compte :
elle garde un identifiant anonyme, pas une clé étrangère — effacer un compte ne
doit pas réécrire l'historique des adversaires.

### Pourquoi pas pgTAP

pgTAP est l'équivalent PostgreSQL de tSQLt : des tests écrits en SQL, qui
vivent dans la base, lancés par `pg_prove`. Il n'est pas utilisé ici, et c'est
un choix, pas un oubli :

- **Il ne verrait pas le risque principal.** La dérive se joue entre le SQL et
  `back/src/schema.ts` — un test qui s'exécute dans la base ne peut pas
  comparer les deux côtés. C'est précisément ce que couvrent les tests
  TypeScript.
- **Il n'y a rien à tester en base pour l'instant** : aucune fonction stockée,
  aucun déclencheur, aucune vue, aucune règle de sécurité par ligne. La base
  est un magasin relationnel piloté entièrement par l'application.
- **Il coûterait** l'extension dans l'image Docker (`CREATE EXTENSION pgtap`),
  Perl et `pg_prove` dans la CI.

À reconsidérer le jour où de la logique vivra vraiment en base (déclencheurs,
fonctions, contraintes complexes, RLS) : c'est là que pgTAP devient le bon
outil, parce que ces objets-là ne se testent bien que de l'intérieur.

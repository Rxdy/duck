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

#!/usr/bin/env bash
# Applique tous les fichiers db/init/*.sql, dans l'ordre, contre DATABASE_URL.
#
# Utilisé à deux endroits :
# - CI (.github/workflows/ci.yml) : le service Postgres démarre vide (pas de
#   volume Docker persistant), ce script lui donne le schéma avant les tests.
# - Local : `docker compose up db` applique déjà ces fichiers automatiquement,
#   mais SEULEMENT à la toute première création du volume — ce script permet
#   de rejouer le schéma sur une base déjà existante (ex. après avoir ajouté
#   une colonne) sans devoir supprimer le volume.
#
# Idempotent : chaque fichier n'utilise que des instructions sûres à
# rejouer (`create table if not exists`, `alter table ... add column if not
# exists`, `insert ... on conflict do nothing`).
set -euo pipefail

DATABASE_URL="${DATABASE_URL:-postgres://duck:duck@localhost:5432/duck}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

for file in "$SCRIPT_DIR"/init/*.sql; do
  echo "Applying $(basename "$file")..."
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$file"
done

echo "Schema up to date."

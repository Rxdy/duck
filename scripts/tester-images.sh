#!/usr/bin/env bash
# Teste les VRAIES images (front nginx + back + Postgres) comme en production : routage, repli SPA, en-têtes,
# schéma appliqué au démarrage, contrôle d'origine du WebSocket, arrêt propre.
# Usage : scripts/tester-images.sh [image-front] [image-back]   (défaut : duck-front:ci duck-back:ci)
set -euo pipefail

FRONT="${1:-duck-front:ci}"
BACK="${2:-duck-back:ci}"
RESEAU="duck-test-$$"
PORT_FRONT="${PORT_FRONT:-18081}"
PORT_BACK="${PORT_BACK:-18082}"
ORIGINE="https://duck.rxdy.fr"

nettoyer() { docker rm -f "$RESEAU-front" "$RESEAU-back" "$RESEAU-db" >/dev/null 2>&1 || true; docker network rm "$RESEAU" >/dev/null 2>&1 || true; }
trap nettoyer EXIT

docker network create "$RESEAU" >/dev/null
docker run -d --name "$RESEAU-db" --network "$RESEAU" -e POSTGRES_USER=duck -e POSTGRES_PASSWORD=duck -e POSTGRES_DB=duck postgres:16-alpine >/dev/null
docker run -d --name "$RESEAU-back" --network "$RESEAU" -p "$PORT_BACK:8080" \
  -e DATABASE_URL="postgres://duck:duck@$RESEAU-db:5432/duck" -e ALLOWED_ORIGINS="$ORIGINE" "$BACK" >/dev/null
docker run -d --name "$RESEAU-front" --network "$RESEAU" -p "$PORT_FRONT:80" "$FRONT" >/dev/null

attendre_http() { for _ in $(seq 1 60); do curl -fs -o /dev/null "$1" && return 0; sleep 1; done; echo "ECHEC : $1 ne répond pas" >&2; docker logs "$RESEAU-back" 2>&1 | tail -15 >&2; exit 1; }
attendre_http "http://localhost:$PORT_FRONT/"
attendre_http "http://localhost:$PORT_BACK/health"

erreurs=0
ok() { echo "ok   $1"; }
ko() { echo "ECHEC $1" >&2; erreurs=$((erreurs + 1)); }
code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
verifier_code() { # description attendu curl-args...
  local d="$1" attendu="$2"; shift 2
  local obtenu; obtenu=$(code "$@")
  if [ "$obtenu" = "$attendu" ]; then ok "$d → $attendu"; else ko "$d : $obtenu au lieu de $attendu"; fi
}

F="http://localhost:$PORT_FRONT"; B="http://localhost:$PORT_BACK"
verifier_code "front : accueil" 200 "$F/"
verifier_code "front : repli SPA (/jouer, rafraîchissement d'une page)" 200 "$F/jouer"
verifier_code "front : asset absent = vraie 404" 404 "$F/assets/inexistant.js"
curl -s "$F/jouer" | grep -qi '<div id="app"' && ok "front : /jouer renvoie l'application" || ko "front : /jouer ne renvoie pas index.html"
for chemin in / /jouer; do
  curl -sI "$F$chemin" | grep -qi '^x-content-type-options: nosniff' && ok "front : nosniff sur $chemin" || ko "front : nosniff absent sur $chemin"
  curl -sI "$F$chemin" | grep -qi '^cache-control: no-cache' && ok "front : HTML revalidé ($chemin)" || ko "front : HTML pas en no-cache ($chemin)"
done

verifier_code "back : /health" 200 "$B/health"
verifier_code "back : origine du site autorisée" 200 -H "Origin: $ORIGINE" "$B/health"
verifier_code "back : origine d'un autre site refusée" 403 -H "Origin: https://pirate.example" "$B/health"
curl -sI -H "Origin: $ORIGINE" "$B/health" | grep -qi "^access-control-allow-origin: $ORIGINE" && ok "back : CORS renvoie l'origine du site" || ko "back : en-tête CORS absent"

ws() { # origine -> code HTTP de la poignée de main WebSocket (101 = ouvert)
  curl -s -o /dev/null -w '%{http_code}' --max-time 3 -H "Connection: Upgrade" -H "Upgrade: websocket" \
    -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: x3JJHMbDL1EzLkh9GBhXDw==" -H "Origin: $1" "$B/" || true
}
[ "$(ws "$ORIGINE")" = "101" ] && ok "WebSocket : origine du site acceptée (101)" || ko "WebSocket : origine du site refusée"
[ "$(ws https://pirate.example)" != "101" ] && ok "WebSocket : autre site refusé" || ko "WebSocket : un autre site a pu se connecter"

tables=$(docker exec "$RESEAU-db" psql -U duck -d duck -tAc "select count(*) from information_schema.tables where table_schema='public'")
[ "$tables" -gt 5 ] && ok "base : schéma appliqué par le serveur au démarrage ($tables tables)" || ko "base : schéma non appliqué ($tables tables)"
docker exec "$RESEAU-back" ls /app/maps/1-map-1v1.json >/dev/null 2>&1 && ok "back : cartes officielles présentes dans l'image" || ko "back : cartes officielles absentes de l'image"

debut=$(date +%s)
docker stop -t 15 "$RESEAU-back" >/dev/null
duree=$(( $(date +%s) - debut ))
sortie=$(docker inspect -f '{{.State.ExitCode}}' "$RESEAU-back")
[ "$sortie" = "0" ] && [ "$duree" -lt 10 ] && ok "arrêt propre : code 0 en ${duree}s" || ko "arrêt : code $sortie en ${duree}s (attendu 0, < 10 s)"

[ "$erreurs" -eq 0 ] && echo "OK : les images se comportent comme en production." || { echo "$erreurs échec(s)." >&2; exit 1; }
